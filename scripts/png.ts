import { deflateSync } from 'node:zlib'

/**
 * A minimal 8-bit greyscale PNG encoder.
 *
 * The project ships no charting or mapping library, and an image codec would
 * be the same kind of dependency for the same kind of shrug. Greyscale is all
 * the packing needs: one band per file, one byte per cell, byte 0 reserved
 * for no-data.
 *
 * Output is byte-identical for identical input — fixed deflate level, no
 * timestamps, no ancillary chunks — which is what the determinism test in
 * `tests/integrity` asserts.
 */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff
  for (const byte of buffer) {
    const index = (crc ^ byte) & 0xff
    crc = (CRC_TABLE[index] as number) ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length, 0)
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(typeAndData), 0)
  return Buffer.concat([length, typeAndData, crc])
}

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

export function encodeGreyscalePng(input: {
  width: number
  height: number
  pixels: Uint8Array
}): Buffer {
  const { width, height, pixels } = input
  if (pixels.length !== width * height) {
    throw new Error(`expected ${width * height} bytes, received ${pixels.length}`)
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr.writeUInt8(8, 8) // bit depth
  ihdr.writeUInt8(0, 9) // colour type: greyscale
  ihdr.writeUInt8(0, 10) // compression
  ihdr.writeUInt8(0, 11) // filter
  ihdr.writeUInt8(0, 12) // interlace

  // Filter type 0 (None) on every scanline. Uniform filtering keeps the
  // encoder deterministic and the decoder trivial.
  const raw = Buffer.alloc(height * (width + 1))
  for (let y = 0; y < height; y += 1) {
    raw[y * (width + 1)] = 0
    Buffer.from(pixels.buffer, pixels.byteOffset + y * width, width).copy(
      raw,
      y * (width + 1) + 1,
    )
  }

  return Buffer.concat([
    SIGNATURE,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}
