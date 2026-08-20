import type { City } from '@/lib/lights/types'

/**
 * A source of composite cells for one city window.
 *
 * Two providers implement it: `eog`, which reads clips of the real Earth
 * Observation Group composites, and `synthetic`, a deterministic stand-in for
 * development. Which one ran is written into the manifest as provenance and
 * rendered on every page — a build made from stand-in data says so.
 */

export interface CellField {
  /** Radiance per cell, nW/cm²/sr, row-major. Length is widthPx * heightPx. */
  readonly radiance: Float32Array
  /** Cloud-free observations per cell. Zero means the sensor saw nothing there. */
  readonly observations: Uint8Array
}

export interface SourceProvider {
  readonly kind: 'eog' | 'synthetic'
  readonly monthlyProduct: string
  readonly annualProduct: string
  readonly sourceVersion: string
  readonly caveat?: string
  /** Monthly VNL v1 — unfiltered: contains fires, boats and other temporal lights. */
  monthly(city: City, month: string): Promise<CellField>
  /** Annual VNL — temporal lights and background removed. */
  annual(city: City, year: number): Promise<CellField>
  /** The national annual composite, already downsampled to the browse grid. */
  overview(year: number, grid: OverviewGrid): Promise<CellField>
}

export interface OverviewGrid {
  readonly west: number
  readonly south: number
  readonly east: number
  readonly north: number
  readonly width: number
  readonly height: number
}
