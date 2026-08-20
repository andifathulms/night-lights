import { describe, expect, it } from 'vitest'
import { atlasSize, decodeFrame, tileOrigin, type AtlasGeometry } from '@/lib/lights/decode'
import { encodeObservations, encodeRadiance } from '@/lib/lights/quantise'
import { summariseFrame } from '@/lib/lights/series'

const GEOMETRY: AtlasGeometry = { tileWidth: 2, tileHeight: 2, columns: 2, tiles: 4 }

function rgba(codes: readonly number[]): Uint8Array {
  const buffer = new Uint8Array(codes.length * 4)
  codes.forEach((code, index) => {
    buffer[index * 4] = code
    buffer[index * 4 + 1] = code
    buffer[index * 4 + 2] = code
    buffer[index * 4 + 3] = 255
  })
  return buffer
}

describe('atlas geometry', () => {
  it('lays tiles out row-major and sizes the atlas to match', () => {
    expect(tileOrigin(GEOMETRY, 0)).toEqual({ x: 0, y: 0 })
    expect(tileOrigin(GEOMETRY, 1)).toEqual({ x: 2, y: 0 })
    expect(tileOrigin(GEOMETRY, 2)).toEqual({ x: 0, y: 2 })
    expect(atlasSize(GEOMETRY)).toEqual({ width: 4, height: 4 })
  })

  it('refuses a tile index outside the atlas', () => {
    expect(() => tileOrigin(GEOMETRY, 4)).toThrow()
  })
})

describe('decoding keeps unseen pixels distinct from dark ones', () => {
  const single: AtlasGeometry = { tileWidth: 2, tileHeight: 1, columns: 1, tiles: 1 }
  // Left pixel: never seen. Right pixel: seen on eleven nights, and dark.
  const observations = rgba([encodeObservations(0), encodeObservations(11)])
  const radiance = rgba([0, encodeRadiance(0)])

  const frame = decodeFrame({
    radianceRgba: radiance,
    observationsRgba: observations,
    geometry: single,
    tileIndex: 0,
  })

  it('marks the unseen pixel as no-data with no radiance at all', () => {
    expect(frame.state[0]).toBe('no-data')
    expect(Number.isNaN(frame.radiance[0] as number)).toBe(true)
    expect(frame.observations[0]).toBe(0)
  })

  it('marks the dark pixel as observed, at zero', () => {
    expect(frame.state[1]).toBe('observed')
    expect(frame.radiance[1]).toBe(0)
    expect(frame.observations[1]).toBe(11)
  })

  it('counts the no-data pixels so a view can say how much it could not see', () => {
    expect(frame.noDataPixels).toBe(1)
  })
})

describe('summarising a frame', () => {
  const single: AtlasGeometry = { tileWidth: 2, tileHeight: 1, columns: 1, tiles: 1 }

  it('emits no-data when nothing in the window was observed', () => {
    const frame = decodeFrame({
      radianceRgba: rgba([0, 0]),
      observationsRgba: rgba([0, 0]),
      geometry: single,
      tileIndex: 0,
    })
    expect(summariseFrame('2016-02', frame).type).toBe('no-data')
  })

  it('never averages an unseen pixel in as a zero', () => {
    // One pixel unseen, one observed at 100. The mean must be 100 — folding
    // the unseen pixel in as a zero would halve it and report darkness that
    // was never measured.
    const frame = decodeFrame({
      radianceRgba: rgba([0, encodeRadiance(100)]),
      observationsRgba: rgba([0, encodeObservations(20)]),
      geometry: single,
      tileIndex: 0,
    })
    const record = summariseFrame('2016-08', frame)
    expect(record.type).toBe('observed')
    if (record.type !== 'observed') return
    expect(record.meanRadiance).toBeGreaterThan(99)
    expect(record.litRatio).toBe(1)
  })
})
