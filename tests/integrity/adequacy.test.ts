import { describe, expect, it } from 'vitest'
import { ADEQUATE_MIN_OBSERVATIONS, classifyAdequacy, makeMonthlyRecord, strokeWeightFor } from '@/lib/lights/adequacy'

describe('adequacy classifies on both sides of the threshold', () => {
  it('is sparse just below and adequate at the threshold', () => {
    expect(classifyAdequacy(ADEQUATE_MIN_OBSERVATIONS - 1)).toBe('sparse')
    expect(classifyAdequacy(ADEQUATE_MIN_OBSERVATIONS)).toBe('adequate')
    expect(classifyAdequacy(ADEQUATE_MIN_OBSERVATIONS + 1)).toBe('adequate')
  })

  it('classifies a single usable observation as sparse, not adequate', () => {
    expect(classifyAdequacy(1)).toBe('sparse')
  })

  it('draws sparse months visibly weaker than adequate ones', () => {
    const sparse = makeMonthlyRecord({
      month: '2016-01',
      observations: ADEQUATE_MIN_OBSERVATIONS - 1,
      meanRadiance: 40,
      litRatio: 0.5,
    })
    const adequate = makeMonthlyRecord({
      month: '2016-08',
      observations: ADEQUATE_MIN_OBSERVATIONS,
      meanRadiance: 40,
      litRatio: 0.5,
    })
    // A spike carried by three cloud-free nights must not look like a
    // finding next to one carried by twenty. DESIGN.md §3.
    expect(strokeWeightFor(sparse)).toBeLessThan(strokeWeightFor(adequate))
  })
})
