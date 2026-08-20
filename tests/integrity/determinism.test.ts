import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { encodeGreyscalePng } from '@/scripts/png'
import { createSyntheticProvider } from '@/scripts/sources/synthetic'
import { MONTHS } from '@/scripts/config'
import { CITIES } from '@/data/cities'
import { encodeObservations, encodeRadiance } from '@/lib/lights/quantise'

/**
 * The same source version and city definitions must produce a byte-identical
 * bundle. PRD.md §9.
 */

function digest(bytes: Uint8Array | Buffer): string {
  return createHash('sha256').update(bytes).digest('hex')
}

describe('the encoder is deterministic', () => {
  it('produces identical bytes for identical pixels', () => {
    const pixels = Uint8Array.from({ length: 64 }, (_, i) => (i * 7) % 256)
    const once = encodeGreyscalePng({ width: 8, height: 8, pixels })
    const twice = encodeGreyscalePng({ width: 8, height: 8, pixels })
    expect(digest(once)).toBe(digest(twice))
  })

  it('produces different bytes when a single cell changes', () => {
    const pixels = new Uint8Array(64)
    const before = encodeGreyscalePng({ width: 8, height: 8, pixels })
    pixels[17] = 42
    const after = encodeGreyscalePng({ width: 8, height: 8, pixels })
    expect(digest(before)).not.toBe(digest(after))
  })
})

describe('the source provider is deterministic', () => {
  const city = CITIES[0]
  const months = MONTHS.slice(0, 6)

  function pack(field: { radiance: Float32Array; observations: Uint8Array }): Uint8Array {
    const bytes = new Uint8Array(field.radiance.length * 2)
    for (let i = 0; i < field.radiance.length; i += 1) {
      const seen = field.observations[i] as number
      if (seen === 0) continue
      bytes[i] = encodeRadiance(field.radiance[i] as number)
      bytes[field.radiance.length + i] = encodeObservations(seen)
    }
    return bytes
  }

  it('returns the same cells for the same city and month, across instances', async () => {
    if (city === undefined) throw new Error('no cities defined')
    const a = createSyntheticProvider({ months: MONTHS, cities: CITIES, sourceVersion: 'test' })
    const b = createSyntheticProvider({ months: MONTHS, cities: CITIES, sourceVersion: 'test' })
    for (const month of months) {
      expect(digest(pack(await a.monthly(city, month)))).toBe(
        digest(pack(await b.monthly(city, month))),
      )
    }
  })

  it('returns different cells for different months', async () => {
    if (city === undefined) throw new Error('no cities defined')
    const provider = createSyntheticProvider({ months: MONTHS, cities: CITIES, sourceVersion: 'test' })
    const first = digest(pack(await provider.monthly(city, MONTHS[0] as string)))
    const second = digest(pack(await provider.monthly(city, MONTHS[1] as string)))
    expect(first).not.toBe(second)
  })
})
