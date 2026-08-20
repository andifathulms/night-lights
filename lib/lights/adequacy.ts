import type { Adequacy, MonthlyRecord } from './types'

/**
 * Adequacy thresholds.
 *
 * EOG ships a cloud-free coverage band with every monthly composite and
 * instructs users not to read a zero radiance as darkness. Over Indonesia a
 * monsoon month can leave a window with a handful of usable overpasses out of
 * ~30 nights. We treat anything below seven cloud-free observations as sparse:
 * the value exists but a spike in it is not a finding.
 *
 * Changing these numbers changes what the site claims. Do not touch them
 * without saying so explicitly (CLAUDE.md, Working style).
 */
export const ADEQUATE_MIN_OBSERVATIONS = 7

/** Below this, a window month is not usable at all and is emitted as `no-data`. */
export const NO_DATA_OBSERVATIONS = 0

export function classifyAdequacy(observations: number): Adequacy {
  return observations >= ADEQUATE_MIN_OBSERVATIONS ? 'adequate' : 'sparse'
}

/**
 * Build a month record. This is the only constructor — it is impossible to
 * produce a record carrying radiance without a positive observation count.
 */
export function makeMonthlyRecord(input: {
  month: string
  observations: number
  meanRadiance: number
  litRatio: number
}): MonthlyRecord {
  if (!Number.isFinite(input.observations) || input.observations < 0) {
    throw new Error(`invalid observation count for ${input.month}: ${input.observations}`)
  }
  if (input.observations === NO_DATA_OBSERVATIONS) {
    return { type: 'no-data', month: input.month, observations: 0 }
  }
  return {
    type: 'observed',
    month: input.month,
    observations: input.observations,
    meanRadiance: input.meanRadiance,
    litRatio: input.litRatio,
    adequacy: classifyAdequacy(input.observations),
  }
}

/**
 * Rendering weight for a month. Sparse months draw visibly weakened so a
 * low-confidence spike cannot look like a finding. DESIGN.md §3.
 */
export function strokeWeightFor(record: MonthlyRecord): number {
  switch (record.type) {
    case 'no-data':
      return 0
    case 'observed':
      switch (record.adequacy) {
        case 'adequate':
          return 1
        case 'sparse':
          return 0.35
        default: {
          const never: never = record.adequacy
          return never
        }
      }
    default: {
      const never: never = record
      return never
    }
  }
}
