import { makeMonthlyRecord } from './adequacy'
import type { DecodedFrame } from './decode'
import type { AnnualRecord, CitySeries, Month, MonthlyRecord } from './types'

/**
 * Per-city aggregation. Pure — CLAUDE.md invariant 15 says nothing is computed
 * in a component, and this is where the computing goes instead.
 */

/**
 * A pixel counts as lit above this radiance. Chosen well above the VIIRS DNB
 * noise floor over unlit tropical land so that sensor noise does not read as
 * a village. nW/cm²/sr.
 */
export const LIT_THRESHOLD_RADIANCE = 0.5

/**
 * Reduce one decoded frame to the month record.
 *
 * `observations` is the median cloud-free count over the observed pixels of
 * the window; a window with no observed pixels at all becomes `no-data`.
 */
export function summariseFrame(month: Month, frame: DecodedFrame): MonthlyRecord {
  let radianceSum = 0
  let litPixels = 0
  let observedPixels = 0
  const counts: number[] = []

  for (let i = 0; i < frame.radiance.length; i += 1) {
    if (frame.state[i] !== 'observed') continue
    const radiance = frame.radiance[i]
    const observations = frame.observations[i]
    if (radiance === undefined || observations === undefined) continue
    observedPixels += 1
    radianceSum += radiance
    counts.push(observations)
    if (radiance >= LIT_THRESHOLD_RADIANCE) litPixels += 1
  }

  if (observedPixels === 0) {
    return makeMonthlyRecord({ month, observations: 0, meanRadiance: 0, litRatio: 0 })
  }

  counts.sort((a, b) => a - b)
  const median = counts[Math.floor(counts.length / 2)] ?? 0

  return makeMonthlyRecord({
    month,
    observations: median,
    meanRadiance: radianceSum / observedPixels,
    litRatio: litPixels / observedPixels,
  })
}

export function yearOf(month: Month): number {
  const year = Number.parseInt(month.slice(0, 4), 10)
  if (!Number.isFinite(year)) throw new Error(`unparseable month: ${month}`)
  return year
}

export function monthsOfYear(months: readonly MonthlyRecord[], year: number): MonthlyRecord[] {
  return months.filter((record) => yearOf(record.month) === year)
}

/** Observed months only. Callers that want the gaps must ask for them. */
export function observedMonths(
  months: readonly MonthlyRecord[],
): Extract<MonthlyRecord, { type: 'observed' }>[] {
  return months.filter(
    (record): record is Extract<MonthlyRecord, { type: 'observed' }> => record.type === 'observed',
  )
}

export function adequateMonths(
  months: readonly MonthlyRecord[],
): Extract<MonthlyRecord, { type: 'observed' }>[] {
  return observedMonths(months).filter((record) => record.adequacy === 'adequate')
}

export interface CoverageSummary {
  readonly totalMonths: number
  readonly noDataMonths: number
  readonly sparseMonths: number
  readonly adequateMonths: number
  /** Adequate months over total months, 0–1. */
  readonly adequacyRatio: number
}

export function summariseCoverage(months: readonly MonthlyRecord[]): CoverageSummary {
  const total = months.length
  const noData = months.filter((record) => record.type === 'no-data').length
  const adequate = adequateMonths(months).length
  return {
    totalMonths: total,
    noDataMonths: noData,
    sparseMonths: total - noData - adequate,
    adequateMonths: adequate,
    adequacyRatio: total === 0 ? 0 : adequate / total,
  }
}

/** Range of the radiance axis, adequate months only — sparse spikes do not set the scale. */
export function radianceExtent(months: readonly MonthlyRecord[]): {
  readonly min: number
  readonly max: number
} {
  const values = adequateMonths(months).map((record) => record.meanRadiance)
  if (values.length === 0) return { min: 0, max: 1 }
  return { min: Math.min(...values), max: Math.max(...values) }
}

export function annualFor(series: CitySeries, year: number): AnnualRecord | undefined {
  return series.years.find((record) => record.year === year)
}
