import { describe, expect, it } from 'vitest'
import {
  NO_DATA_CODE,
  OBSERVATION_SCALE,
  RADIANCE_SCALE,
  decodeObservations,
  decodeRadiance,
  encodeObservations,
  encodeRadiance,
  radianceQuantisationError,
} from '@/lib/lights/quantise'

describe('quantisation round-trips within its stated scale', () => {
  it('keeps radiance inside the scale error at every magnitude', () => {
    for (const radiance of [0, 0.05, 0.5, 1, 5, 25, 90, 200, 399.9]) {
      const decoded = decodeRadiance(encodeRadiance(radiance))
      expect(Math.abs(decoded - radiance)).toBeLessThanOrEqual(
        radianceQuantisationError(radiance) + 1e-9,
      )
    }
  })

  it('clamps above the stated maximum rather than wrapping', () => {
    const code = encodeRadiance(RADIANCE_SCALE.maxRadiance * 4)
    expect(code).toBe(RADIANCE_SCALE.codes)
    expect(decodeRadiance(code)).toBeCloseTo(RADIANCE_SCALE.maxRadiance, 6)
  })

  it('round-trips observation counts exactly', () => {
    for (let count = 1; count <= OBSERVATION_SCALE.maxObservations; count += 1) {
      expect(decodeObservations(encodeObservations(count))).toBe(count)
    }
  })
})

describe('byte 0 is reserved for "not seen" in both bands', () => {
  it('encodes an observed radiance of zero as something other than no-data', () => {
    // The whole point of the reservation: a real zero must not land on the
    // code that means the satellite could not see.
    expect(encodeRadiance(0)).not.toBe(NO_DATA_CODE)
    expect(encodeRadiance(0)).toBe(1)
    expect(decodeRadiance(1)).toBe(0)
  })

  it('encodes zero observations as the no-data code', () => {
    expect(encodeObservations(0)).toBe(NO_DATA_CODE)
    expect(decodeObservations(NO_DATA_CODE)).toBe(0)
  })

  it('refuses to hand back a radiance for the no-data code', () => {
    expect(() => decodeRadiance(NO_DATA_CODE)).toThrow()
  })
})
