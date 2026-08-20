import { describe, expect, it } from 'vitest'
import { DIVERGENCE_RATIO_THRESHOLD, computeFlags } from '@/lib/lights/divergence'
import { makeMonthlyRecord } from '@/lib/lights/adequacy'
import type { AnnualRecord, City } from '@/lib/lights/types'

/**
 * Flags are computed from monthly-versus-annual divergence, never authored.
 * CLAUDE.md invariant 5.
 */

function city(overrides: Partial<City> = {}): City {
  return {
    id: 'test',
    name: 'Test',
    province: 'Test',
    coastal: false,
    fireBelt: false,
    window: { west: 0, south: 0, east: 0.4, north: 0.4, widthPx: 96, heightPx: 96 },
    ...overrides,
  }
}

const YEAR_2015: AnnualRecord = { year: 2015, meanRadiance: 10, litRatio: 0.3, observations: 200 }

function month(key: string, meanRadiance: number, observations = 20) {
  return makeMonthlyRecord({ month: key, observations, meanRadiance, litRatio: 0.3 })
}

describe('divergence produces the flags', () => {
  it('flags a fire-belt month in the dry season that runs far above its annual value', () => {
    const flags = computeFlags({
      city: city({ fireBelt: true }),
      months: [month('2015-09', 40)],
      years: [YEAR_2015],
    })
    expect(flags).toHaveLength(1)
    expect(flags[0]?.reason).toBe('fire-divergence')
    expect(flags[0]?.ratio).toBeCloseTo(4, 6)
  })

  it('attributes divergence on a coastal window outside the fire season to boats', () => {
    const flags = computeFlags({
      city: city({ coastal: true }),
      months: [month('2015-03', 40)],
      years: [YEAR_2015],
    })
    expect(flags[0]?.reason).toBe('offshore-divergence')
  })

  it('leaves a month sitting close to its annual value alone', () => {
    const flags = computeFlags({
      city: city({ fireBelt: true, coastal: true }),
      months: [month('2015-09', 10 * (DIVERGENCE_RATIO_THRESHOLD - 0.05))],
      years: [YEAR_2015],
    })
    expect(flags).toHaveLength(0)
  })

  it('is decided by the data, not by the calendar', () => {
    // Same city, same fire-season month, ordinary brightness: no flag. The
    // fire calendar only chooses the wording of a divergence that the numbers
    // already produced.
    const quiet = computeFlags({
      city: city({ fireBelt: true }),
      months: [month('2015-09', 10)],
      years: [YEAR_2015],
    })
    expect(quiet).toHaveLength(0)
  })

  it('never flags a sparse month', () => {
    // With three cloud-free nights the divergence could as easily be noise,
    // and asserting fire contamination on it would be a claim the data
    // cannot carry.
    const flags = computeFlags({
      city: city({ fireBelt: true }),
      months: [month('2015-09', 400, 3)],
      years: [YEAR_2015],
    })
    expect(flags).toHaveLength(0)
  })

  it('never flags a no-data month', () => {
    const flags = computeFlags({
      city: city({ fireBelt: true, coastal: true }),
      months: [makeMonthlyRecord({ month: '2015-09', observations: 0, meanRadiance: 0, litRatio: 0 })],
      years: [YEAR_2015],
    })
    expect(flags).toHaveLength(0)
  })

  it('emits nothing when the year has no annual composite to diverge from', () => {
    const flags = computeFlags({
      city: city({ fireBelt: true }),
      months: [month('2015-09', 400)],
      years: [],
    })
    expect(flags).toHaveLength(0)
  })
})
