import { observedMonths, yearOf } from './series'
import type { AnnualRecord, City, ContaminationFlag, MonthlyRecord } from './types'

/**
 * Contamination flags, computed from monthly-versus-annual divergence.
 *
 * The monthly VNL v1 composites are not filtered for aurora, fires, boats or
 * other temporal lights; the annual composites are. So where a month sits far
 * above its own year's cleaned annual value, the excess is temporal light —
 * over Indonesia, overwhelmingly peat fires and lit fishing fleets.
 *
 * This is derived every build. A hand-written flag list drifts away from the
 * data it claims to describe; a computed one cannot. CLAUDE.md invariant 5.
 */

/** A month brighter than this multiple of its annual value is divergent. */
export const DIVERGENCE_RATIO_THRESHOLD = 1.6

/**
 * Peat-fire season over Sumatra and Kalimantan: the dry months when burning
 * for land clearance peaks, as in the 2015 and 2019 haze events. Used only to
 * choose *which* explanation a computed divergence gets, never to create one.
 */
const FIRE_SEASON_MONTHS = new Set([7, 8, 9, 10])

function monthNumber(month: string): number {
  const value = Number.parseInt(month.slice(5, 7), 10)
  if (!Number.isFinite(value)) throw new Error(`unparseable month: ${month}`)
  return value
}

export function divergenceRatio(
  record: Extract<MonthlyRecord, { type: 'observed' }>,
  annual: AnnualRecord | undefined,
): number | undefined {
  if (annual === undefined || annual.meanRadiance <= 0) return undefined
  return record.meanRadiance / annual.meanRadiance
}

/**
 * Flags for one city. A sparse month is never flagged: with few cloud-free
 * observations the divergence could as easily be noise, and asserting fire
 * contamination on it would be a claim the data cannot carry.
 */
export function computeFlags(input: {
  city: City
  months: readonly MonthlyRecord[]
  years: readonly AnnualRecord[]
  threshold?: number
}): ContaminationFlag[] {
  const threshold = input.threshold ?? DIVERGENCE_RATIO_THRESHOLD
  const annualByYear = new Map(input.years.map((record) => [record.year, record]))
  const flags: ContaminationFlag[] = []

  for (const record of observedMonths(input.months)) {
    if (record.adequacy !== 'adequate') continue
    const ratio = divergenceRatio(record, annualByYear.get(yearOf(record.month)))
    if (ratio === undefined || ratio < threshold) continue

    const inFireSeason = input.city.fireBelt && FIRE_SEASON_MONTHS.has(monthNumber(record.month))
    if (inFireSeason) {
      flags.push({ month: record.month, reason: 'fire-divergence', ratio })
    } else if (input.city.coastal) {
      flags.push({ month: record.month, reason: 'offshore-divergence', ratio })
    } else if (input.city.fireBelt) {
      flags.push({ month: record.month, reason: 'fire-divergence', ratio })
    }
  }

  return flags
}

export function flagLabel(reason: ContaminationFlag['reason']): {
  readonly id: string
  readonly en: string
  /** A glyph, so the marker is not colour-only. DESIGN.md §9. */
  readonly glyph: string
} {
  switch (reason) {
    case 'fire-divergence':
      return {
        id: 'Bulan ini jauh lebih terang daripada komposit tahunan yang sudah disaring — kemungkinan cahaya kebakaran.',
        en: 'This month is far brighter than the filtered annual composite — likely fire light.',
        glyph: '△',
      }
    case 'offshore-divergence':
      return {
        id: 'Bulan ini jauh lebih terang daripada komposit tahunan yang sudah disaring — kemungkinan lampu kapal ikan di lepas pantai.',
        en: 'This month is far brighter than the filtered annual composite — likely lit fishing boats offshore.',
        glyph: '◇',
      }
    default: {
      const never: never = reason
      return never
    }
  }
}
