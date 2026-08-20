import { join } from 'node:path'

/**
 * Series extent and build-wide constants.
 *
 * VIIRS DNB monthly composites begin in April 2012. The series ends at the
 * last complete year rather than the current month: composites lag by months,
 * and PRD.md §6 rules out any recent-month or real-time framing.
 */

export const SERIES_START = '2012-04'
export const SERIES_END = '2025-12'

function enumerateMonths(start: string, end: string): string[] {
  const months: string[] = []
  let year = Number.parseInt(start.slice(0, 4), 10)
  let month = Number.parseInt(start.slice(5, 7), 10)
  const endYear = Number.parseInt(end.slice(0, 4), 10)
  const endMonth = Number.parseInt(end.slice(5, 7), 10)
  while (year < endYear || (year === endYear && month <= endMonth)) {
    months.push(`${year}-${String(month).padStart(2, '0')}`)
    month += 1
    if (month > 12) {
      month = 1
      year += 1
    }
  }
  return months
}

export const MONTHS: readonly string[] = enumerateMonths(SERIES_START, SERIES_END)

/** Full calendar years only — a part year is not comparable with a whole one. */
export const YEARS: readonly number[] = Array.from(
  new Set(MONTHS.map((month) => Number.parseInt(month.slice(0, 4), 10))),
).filter((year) => MONTHS.filter((month) => month.startsWith(String(year))).length === 12)

/** 13 columns lays 165 monthly tiles into a near-square atlas. */
export const STACK_COLUMNS = 13

/** Indonesia's bounding box, downsampled hard. This is a doorway, not the product. */
export const OVERVIEW_GRID = {
  west: 94.5,
  south: -11.5,
  east: 141.5,
  north: 6.5,
  width: 752,
  height: 288,
} as const

/** Generated bundle. Ignored by git — CI runs `data:build` before `next build`. */
export const OUT_ROOT = join(process.cwd(), 'public', 'data')

/** Size budgets, asserted by `data:validate`. PRD.md §3. */
export const BUDGET = {
  perCityBytes: 2 * 1024 * 1024,
  overviewBytes: 4 * 1024 * 1024,
  seriesBytes: 6 * 1024 * 1024,
} as const

/** Attribution is structural, not a footer courtesy. PRD.md §8, CLAUDE.md invariant 14. */
export const CITATIONS = [
  {
    label: 'Dataset',
    text: 'Earth Observation Group, Payne Institute for Public Policy, Colorado School of Mines. VIIRS Day/Night Band cloud-free composites. Public domain.',
    url: 'https://eogdata.mines.edu/products/vnl/',
  },
  {
    label: 'Elvidge et al. 2017',
    text: 'Elvidge, C.D., Baugh, K., Zhizhin, M., Hsu, F.C., Ghosh, T. VIIRS night-time lights. International Journal of Remote Sensing 38(21), 5860–5879.',
  },
  {
    label: 'Elvidge et al. 2021',
    text: 'Elvidge, C.D., Zhizhin, M., Ghosh, T., Hsu, F.C., Taneja, J. Annual time series of global VIIRS nighttime lights derived from monthly averages: 2012 to 2019. Remote Sensing 13(5), 922.',
  },
] as const
