import { strokeWeightFor } from '@/lib/lights/adequacy'
import { radianceExtent } from '@/lib/lights/series'
import type { ContaminationFlag, MonthlyRecord } from '@/lib/lights/types'

/**
 * Chart geometry, computed here rather than in a component.
 * CLAUDE.md invariant 15.
 *
 * The layout is fixed by DESIGN.md §3: the radiance line on top, the
 * cloud-free observation band directly beneath it on the same x axis. They
 * are produced by one function from one array of records, so there is no
 * arrangement of this code in which a line gets drawn without its band.
 */

export const CHART = {
  width: 1000,
  lineTop: 10,
  lineHeight: 190,
  bandTop: 214,
  bandHeight: 66,
  axisTop: 288,
  height: 312,
  padLeft: 6,
  padRight: 6,
} as const

/** Observations above this fill the band; the axis is labelled with it. */
export const BAND_CEILING = 30

export interface Point {
  readonly x: number
  readonly y: number
}

export interface LineSegment {
  /** Two-point path. Segments are per month-pair so weight can vary along the line. */
  readonly d: string
  /** 1 for adequate, lower for sparse. DESIGN.md §3. */
  readonly weight: number
  readonly adequacy: 'adequate' | 'sparse'
  readonly fromMonth: string
  readonly toMonth: string
}

export interface BandBar {
  readonly month: string
  readonly x: number
  readonly width: number
  readonly y: number
  readonly height: number
  readonly observations: number
  /** No-data bars are drawn with the hatch pattern, never as a zero-height bar. */
  readonly state: 'observed' | 'no-data'
}

export interface NoDataColumn {
  readonly month: string
  readonly x: number
  readonly width: number
}

export interface ChartGeometry {
  readonly segments: readonly LineSegment[]
  readonly points: readonly (Point & { readonly month: string; readonly weight: number })[]
  readonly bars: readonly BandBar[]
  readonly noDataColumns: readonly NoDataColumn[]
  readonly flagMarks: readonly { readonly month: string; readonly x: number; readonly reason: ContaminationFlag['reason'] }[]
  readonly yearTicks: readonly { readonly year: number; readonly x: number }[]
  readonly max: number
  readonly min: number
}

function slotWidth(count: number): number {
  return (CHART.width - CHART.padLeft - CHART.padRight) / Math.max(count, 1)
}

export function xForIndex(index: number, count: number): number {
  const width = slotWidth(count)
  return CHART.padLeft + index * width + width / 2
}

export function indexForX(x: number, count: number): number {
  const width = slotWidth(count)
  const index = Math.floor((x - CHART.padLeft) / width)
  return Math.min(Math.max(index, 0), count - 1)
}

export function buildChartGeometry(input: {
  months: readonly MonthlyRecord[]
  flags: readonly ContaminationFlag[]
  /** Shared across compared cities so lines sit on one axis. */
  maxRadiance?: number
}): ChartGeometry {
  const { months, flags } = input
  const count = months.length
  const extent = radianceExtent(months)
  // The axis is set by adequate months only: a spike carried by three
  // cloud-free nights must not rescale everything else.
  const max = input.maxRadiance ?? Math.max(extent.max * 1.08, 0.001)
  const width = slotWidth(count)

  const yFor = (radiance: number): number =>
    CHART.lineTop + CHART.lineHeight - (Math.min(radiance, max) / max) * CHART.lineHeight

  const points: (Point & { month: string; weight: number })[] = []
  const bars: BandBar[] = []
  const noDataColumns: NoDataColumn[] = []

  months.forEach((record, index) => {
    const x = xForIndex(index, count)
    const barX = CHART.padLeft + index * width

    if (record.type === 'no-data') {
      // No point, no bar height, no interpolation across the gap. A hatched
      // column instead, in both the line area and the band, so the reader
      // sees an absence rather than a value. CLAUDE.md invariant 2.
      noDataColumns.push({ month: record.month, x: barX, width })
      bars.push({
        month: record.month,
        x: barX,
        width,
        y: CHART.bandTop,
        height: CHART.bandHeight,
        observations: 0,
        state: 'no-data',
      })
      return
    }

    points.push({ month: record.month, x, y: yFor(record.meanRadiance), weight: strokeWeightFor(record) })
    const height = Math.max(
      1,
      (Math.min(record.observations, BAND_CEILING) / BAND_CEILING) * CHART.bandHeight,
    )
    bars.push({
      month: record.month,
      x: barX,
      width,
      y: CHART.bandTop + CHART.bandHeight - height,
      height,
      observations: record.observations,
      state: 'observed',
    })
  })

  // Segments join consecutive *observed* months only where they are also
  // adjacent in the series. A gap is never bridged: drawing a line across a
  // month the satellite could not see would invent a measurement.
  const segments: LineSegment[] = []
  const indexByMonth = new Map(months.map((record, index) => [record.month, index]))
  for (let i = 1; i < points.length; i += 1) {
    const previous = points[i - 1]
    const current = points[i]
    if (previous === undefined || current === undefined) continue
    const previousIndex = indexByMonth.get(previous.month)
    const currentIndex = indexByMonth.get(current.month)
    if (previousIndex === undefined || currentIndex === undefined) continue
    if (currentIndex - previousIndex !== 1) continue
    const weight = Math.min(previous.weight, current.weight)
    segments.push({
      d: `M ${previous.x.toFixed(2)} ${previous.y.toFixed(2)} L ${current.x.toFixed(2)} ${current.y.toFixed(2)}`,
      weight,
      adequacy: weight < 1 ? 'sparse' : 'adequate',
      fromMonth: previous.month,
      toMonth: current.month,
    })
  }

  const flagMarks = flags
    .map((flag) => {
      const index = indexByMonth.get(flag.month)
      return index === undefined
        ? undefined
        : { month: flag.month, x: xForIndex(index, count), reason: flag.reason }
    })
    .filter((mark): mark is { month: string; x: number; reason: ContaminationFlag['reason'] } => mark !== undefined)

  const yearTicks: { year: number; x: number }[] = []
  months.forEach((record, index) => {
    if (!record.month.endsWith('-01')) return
    yearTicks.push({ year: Number.parseInt(record.month.slice(0, 4), 10), x: xForIndex(index, count) })
  })

  return { segments, points, bars, noDataColumns, flagMarks, yearTicks, max, min: extent.min }
}
