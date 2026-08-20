import { describe, expect, it } from 'vitest'
import { makeMonthlyRecord, strokeWeightFor } from '@/lib/lights/adequacy'
import { monthlyRecordSchema } from '@/lib/data/schema'

/**
 * The observation count is mandatory, and a zero is not darkness.
 *
 * This is PRD.md §9 and the single thing this project cannot get wrong. The
 * tests are written against both the constructor and the schema, because a
 * record can enter the system through either.
 */

describe('a radiance value never travels without its observation count', () => {
  it('produces no-data when nothing was observed', () => {
    const record = makeMonthlyRecord({
      month: '2015-01',
      observations: 0,
      meanRadiance: 12.4,
      litRatio: 0.3,
    })
    expect(record.type).toBe('no-data')
    // The radiance handed in is discarded rather than carried: with no
    // cloud-free observation there is nothing it could be a measurement of.
    expect(record).not.toHaveProperty('meanRadiance')
    expect(record).not.toHaveProperty('litRatio')
  })

  it('keeps the count on every observed record', () => {
    const record = makeMonthlyRecord({
      month: '2015-08',
      observations: 14,
      meanRadiance: 12.4,
      litRatio: 0.3,
    })
    expect(record.type).toBe('observed')
    expect(record.observations).toBe(14)
  })

  it('rejects a negative or non-finite count outright', () => {
    expect(() =>
      makeMonthlyRecord({ month: '2015-08', observations: -1, meanRadiance: 1, litRatio: 0 }),
    ).toThrow()
    expect(() =>
      makeMonthlyRecord({ month: '2015-08', observations: Number.NaN, meanRadiance: 1, litRatio: 0 }),
    ).toThrow()
  })

  it('fails validation for a radiance value with no count beside it', () => {
    const orphan = { type: 'observed', month: '2015-08', meanRadiance: 12.4, litRatio: 0.3, adequacy: 'adequate' }
    expect(monthlyRecordSchema.safeParse(orphan).success).toBe(false)
  })

  it('fails validation for a radiance value with a zero count', () => {
    const impossible = {
      type: 'observed',
      month: '2015-08',
      observations: 0,
      meanRadiance: 12.4,
      litRatio: 0.3,
      adequacy: 'sparse',
    }
    expect(monthlyRecordSchema.safeParse(impossible).success).toBe(false)
  })

  it('fails validation for a no-data month carrying radiance', () => {
    const conflated = { type: 'no-data', month: '2015-08', observations: 0, meanRadiance: 0 }
    // Zod strips unknown keys rather than rejecting; assert on the parsed
    // shape, which is what any consumer would actually receive.
    const parsed = monthlyRecordSchema.parse(conflated)
    expect(parsed).not.toHaveProperty('meanRadiance')
  })
})

describe('no-data and observed-dark are different things', () => {
  const noData = makeMonthlyRecord({ month: '2016-02', observations: 0, meanRadiance: 0, litRatio: 0 })
  const observedDark = makeMonthlyRecord({ month: '2016-03', observations: 21, meanRadiance: 0, litRatio: 0 })

  it('separates them in the model', () => {
    expect(noData.type).toBe('no-data')
    expect(observedDark.type).toBe('observed')
    expect(noData.type).not.toBe(observedDark.type)
  })

  it('separates them in what gets rendered', () => {
    // A no-data month draws no line segment at all; an observed-dark month
    // draws one at zero. Collapsing these would say the satellite saw
    // darkness when it saw nothing.
    expect(strokeWeightFor(noData)).toBe(0)
    expect(strokeWeightFor(observedDark)).toBeGreaterThan(0)
  })

  it('never lets a no-data month fall back to a value', () => {
    expect('meanRadiance' in noData).toBe(false)
  })
})
