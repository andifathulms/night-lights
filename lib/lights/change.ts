import { annualFor, monthsOfYear, summariseCoverage } from './series'
import type { CitySeries } from './types'

/**
 * The change table.
 *
 * It measures change in lit area and mean radiance between two years, and it
 * is named for exactly that. Radiance is not development, prosperity or GDP;
 * the relationship is nonlinear and confounded by lighting technology, view
 * angle, land use and contamination, and ranking Indonesian regions by
 * anything that reads as progress is outside this project's business.
 * PRD.md §5, CLAUDE.md invariant 6.
 *
 * Annual composites are used for both endpoints because they have temporal
 * lights removed — comparing unfiltered monthly endpoints would rank the 2015
 * haze rather than anything about the cities.
 */

/** Below this share of adequate months in an endpoint year, the entry is marked thin. */
export const ENDPOINT_ADEQUACY_MIN = 0.5

export type EndpointAdequacy = 'adequate' | 'thin' | 'missing'

export interface ChangeEntry {
  readonly cityId: string
  readonly fromYear: number
  readonly toYear: number
  /** nW/cm²/sr, signed. */
  readonly meanRadianceChange: number
  /** Fraction of window pixels, signed, −1 to 1. */
  readonly litRatioChange: number
  readonly fromAdequacy: EndpointAdequacy
  readonly toAdequacy: EndpointAdequacy
  /** True when either endpoint's coverage is too thin to carry the comparison. */
  readonly underpowered: boolean
}

function endpointAdequacy(series: CitySeries, year: number): EndpointAdequacy {
  if (annualFor(series, year) === undefined) return 'missing'
  const coverage = summariseCoverage(monthsOfYear(series.months, year))
  if (coverage.totalMonths === 0) return 'missing'
  return coverage.adequacyRatio >= ENDPOINT_ADEQUACY_MIN ? 'adequate' : 'thin'
}

/**
 * One city's change between two years, or undefined when either endpoint is
 * absent. Entries always carry adequacy for both endpoints — an entry cannot
 * be ranked without it. CLAUDE.md invariant 7.
 */
export function computeChange(
  series: CitySeries,
  fromYear: number,
  toYear: number,
): ChangeEntry | undefined {
  const from = annualFor(series, fromYear)
  const to = annualFor(series, toYear)
  if (from === undefined || to === undefined) return undefined

  const fromAdequacy = endpointAdequacy(series, fromYear)
  const toAdequacy = endpointAdequacy(series, toYear)

  return {
    cityId: series.cityId,
    fromYear,
    toYear,
    meanRadianceChange: to.meanRadiance - from.meanRadiance,
    litRatioChange: to.litRatio - from.litRatio,
    fromAdequacy,
    toAdequacy,
    underpowered: fromAdequacy !== 'adequate' || toAdequacy !== 'adequate',
  }
}

export type ChangeMetric = 'meanRadiance' | 'litRatio'

export function rankByChange(
  entries: readonly ChangeEntry[],
  metric: ChangeMetric,
): ChangeEntry[] {
  const value = (entry: ChangeEntry): number =>
    metric === 'meanRadiance' ? entry.meanRadianceChange : entry.litRatioChange
  // Stable: ties fall back to the city id so the table is deterministic.
  return [...entries].sort((a, b) => value(b) - value(a) || a.cityId.localeCompare(b.cityId))
}

export function buildChangeTable(
  allSeries: readonly CitySeries[],
  fromYear: number,
  toYear: number,
  metric: ChangeMetric = 'litRatio',
): ChangeEntry[] {
  const entries = allSeries
    .map((series) => computeChange(series, fromYear, toYear))
    .filter((entry): entry is ChangeEntry => entry !== undefined)
  return rankByChange(entries, metric)
}
