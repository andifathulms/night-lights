/**
 * The data model. CLAUDE.md invariants 1 and 2 live here rather than in
 * component discipline: a radiance value and its cloud-free observation
 * count are one record, and a month with zero observations is a different
 * *shape* of record — one that has no radiance field to render.
 *
 * Source: VIIRS DNB cloud-free composites, Earth Observation Group,
 * Payne Institute, Colorado School of Mines (Elvidge et al. 2017, 2021).
 */

/** Month key, always `YYYY-MM`. */
export type Month = string

/** Adequacy of a month's cloud-free coverage. Never inferred at render time. */
export type Adequacy = 'adequate' | 'sparse'

/**
 * A single city-month.
 *
 * `no-data` is not "dark" and carries no radiance. There is deliberately no
 * optional `meanRadiance` on it — a component cannot reach for a value that
 * does not exist, so PRD.md §1 is enforced by the type checker.
 */
export type MonthlyRecord =
  | {
      readonly type: 'no-data'
      readonly month: Month
      readonly observations: 0
    }
  | {
      readonly type: 'observed'
      readonly month: Month
      /** Cloud-free observations contributing to this composite. Always > 0 here. */
      readonly observations: number
      /** Mean radiance over the city window, nW/cm²/sr. */
      readonly meanRadiance: number
      /** Fraction of window pixels above the lit threshold, 0–1. */
      readonly litRatio: number
      readonly adequacy: Adequacy
    }

/** An annual composite value. Annual layers have temporal lights removed. */
export interface AnnualRecord {
  readonly year: number
  readonly meanRadiance: number
  readonly litRatio: number
  /** Total cloud-free observations across the year. */
  readonly observations: number
}

/** Which composite family a value came from. Drives the legend wording. */
export type LayerKind =
  /** Monthly VNL v1 — NOT filtered for aurora, fires, boats or other temporal lights. */
  | 'monthly-unfiltered'
  /** Annual VNL — temporal lights and background removed. */
  | 'annual-filtered'

/** Why a month is flagged. Computed, never hand-authored. CLAUDE.md invariant 5. */
export type FlagReason = 'fire-divergence' | 'offshore-divergence'

export interface ContaminationFlag {
  readonly month: Month
  readonly reason: FlagReason
  /** Monthly mean over annual mean for the same year. > 1 means the month is brighter. */
  readonly ratio: number
}

export interface CityWindow {
  /** Degrees. West, south, east, north. */
  readonly west: number
  readonly south: number
  readonly east: number
  readonly north: number
  readonly widthPx: number
  readonly heightPx: number
}

export interface City {
  readonly id: string
  readonly name: string
  readonly province: string
  /** Coastal windows can contain lit fishing boats. PRD.md §2. */
  readonly coastal: boolean
  /** Sumatra and Kalimantan windows sit in the peat-fire belt. PRD.md §2. */
  readonly fireBelt: boolean
  readonly window: CityWindow
  readonly note?: string
}

export interface CitySeries {
  readonly cityId: string
  readonly months: readonly MonthlyRecord[]
  readonly years: readonly AnnualRecord[]
  readonly flags: readonly ContaminationFlag[]
}
