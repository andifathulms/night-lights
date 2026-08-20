import { describe, expect, it } from 'vitest'
import { decodeFrame, type AtlasGeometry } from '@/lib/lights/decode'
import { encodeObservations, encodeRadiance } from '@/lib/lights/quantise'
import { paintFrame } from '@/lib/chart/paint'
import { NIGHT_RGB, NO_DATA_RGB, rampColour } from '@/lib/chart/ramp'

/**
 * No-data and observed-dark asserted distinct **in the rendered output**, not
 * only in the model. Both directions.
 *
 * The model-level version of this test lives in `record.test.ts`. This one
 * exists because the model could be perfect and the paint could still put an
 * unseen cell and a dark cell on the same colour, which is the failure the
 * whole project is built to prevent.
 */

function rgbaAt(pixels: Uint8ClampedArray, index: number): [number, number, number, number] {
  return [
    pixels[index * 4] as number,
    pixels[index * 4 + 1] as number,
    pixels[index * 4 + 2] as number,
    pixels[index * 4 + 3] as number,
  ]
}

function planes(codes: readonly number[]): Uint8Array {
  const buffer = new Uint8Array(codes.length * 4)
  codes.forEach((code, index) => {
    buffer[index * 4] = code
    buffer[index * 4 + 1] = code
    buffer[index * 4 + 2] = code
    buffer[index * 4 + 3] = 255
  })
  return buffer
}

/**
 * A 12x1 strip: six cells unseen, six observed and dark. Six wide because
 * the hatch has a six-cell period, and a narrower run could sit entirely
 * inside one stripe and pass a test that proves nothing.
 */
const UNSEEN = [0, 1, 2, 3, 4, 5]
const DARK = [6, 7, 8, 9, 10, 11]
const geometry: AtlasGeometry = { tileWidth: 12, tileHeight: 1, columns: 1, tiles: 1 }
const frame = decodeFrame({
  radianceRgba: planes([
    ...UNSEEN.map(() => 0),
    ...DARK.map(() => encodeRadiance(0)),
  ]),
  observationsRgba: planes([
    ...UNSEEN.map(() => encodeObservations(0)),
    ...DARK.map(() => encodeObservations(18)),
  ]),
  geometry,
  tileIndex: 0,
})
const raster = paintFrame(frame)

describe('an unseen cell and a dark cell never look alike', () => {
  it('paints no cell of the unseen run in any colour used by the dark run', () => {
    const unseen = UNSEEN.map((index) => rgbaAt(raster.pixels, index).join(','))
    const dark = DARK.map((index) => rgbaAt(raster.pixels, index).join(','))
    for (const colour of unseen) {
      expect(dark).not.toContain(colour)
    }
  })

  it('paints the dark run at the bottom of the radiance ramp', () => {
    const bottom = rampColour(0)
    for (const index of DARK) {
      expect(rgbaAt(raster.pixels, index).slice(0, 3)).toEqual([...bottom])
    }
  })

  it('paints the unseen run in the no-data grey, off the ramp entirely', () => {
    const unseen = UNSEEN.map((index) => rgbaAt(raster.pixels, index).slice(0, 3).join(','))
    expect(unseen).toContain(NO_DATA_RGB.join(','))
    // Nothing in the unseen run may land on the ramp — that is the collision
    // the reserved byte and the separate colour exist to prevent.
    for (let stop = 0; stop <= 1.0001; stop += 0.05) {
      expect(unseen).not.toContain(rampColour(stop).join(','))
    }
  })

  it('carries a hatch, so the distinction survives without colour', () => {
    // Two tones alternating across the unseen run: a pattern, not a flat fill.
    const tones = new Set(UNSEEN.map((index) => rgbaAt(raster.pixels, index).join(',')))
    expect(tones.size).toBeGreaterThan(1)
    expect([...tones]).toEqual(
      expect.arrayContaining([[...NO_DATA_RGB, 255].join(','), [...NIGHT_RGB, 255].join(',')]),
    )
  })

  it('paints every cell fully opaque, so nothing shows through as a value', () => {
    for (let index = 0; index < 12; index += 1) {
      expect(rgbaAt(raster.pixels, index)[3]).toBe(255)
    }
  })
})

describe('the ramp itself', () => {
  it('is luminance-monotonic, so brighter always reads brighter', () => {
    let previous = -1
    for (let stop = 0; stop <= 1.0001; stop += 0.05) {
      const [r, g, b] = rampColour(stop)
      const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b
      expect(luminance).toBeGreaterThan(previous)
      previous = luminance
    }
  })

  it('keeps the no-data grey off the ramp at every stop', () => {
    for (let stop = 0; stop <= 1.0001; stop += 0.01) {
      expect(rampColour(stop).join(',')).not.toBe(NO_DATA_RGB.join(','))
    }
  })
})
