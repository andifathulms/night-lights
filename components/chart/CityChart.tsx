'use client'

import { useId, useMemo } from 'react'
import { ObservationBand } from '@/components/band/ObservationBand'
import { RadianceLine } from '@/components/line/RadianceLine'
import { FlagMarkers } from '@/components/flags/FlagMarkers'
import { BAND_CEILING, CHART, buildChartGeometry, indexForX } from '@/lib/chart/geometry'
import { copyFor } from '@/lib/i18n/copy'
import { formatMonth, type Locale } from '@/lib/i18n'
import type { ContaminationFlag, MonthlyRecord } from '@/lib/lights/types'

/**
 * Line and band as one component.
 *
 * They are not composable separately on purpose: `buildChartGeometry` returns
 * both from one pass over one array of records, and this is the only place
 * either is rendered. A radiance line without its observation band is the
 * wrong product. DESIGN.md §3.
 */
export function CityChart({
  months,
  flags,
  index,
  onIndex,
  locale,
  maxRadiance,
  title,
  compact = false,
}: {
  months: readonly MonthlyRecord[]
  flags: readonly ContaminationFlag[]
  index: number
  onIndex?: (index: number) => void
  locale: Locale
  maxRadiance?: number
  title: string
  compact?: boolean
}) {
  const copy = copyFor(locale)
  const uid = useId().replace(/:/g, '')
  const hatchId = `hatch-${uid}`
  const bandLabelId = `band-${uid}`
  const titleId = `title-${uid}`

  const geometry = useMemo(
    () => buildChartGeometry({ months, flags, ...(maxRadiance === undefined ? {} : { maxRadiance }) }),
    [months, flags, maxRadiance],
  )

  const current = months[index]
  const cursorX = geometry.points.find((point) => point.month === current?.month)?.x
  const cursorFallback =
    current === undefined ? 0 : (geometry.bars.find((bar) => bar.month === current.month)?.x ?? 0)

  function handlePointer(event: React.PointerEvent<SVGSVGElement>): void {
    if (onIndex === undefined) return
    const target = event.currentTarget
    const rect = target.getBoundingClientRect()
    const x = ((event.clientX - rect.left) / rect.width) * CHART.width
    onIndex(indexForX(x, months.length))
  }

  return (
    <figure className="w-full">
      <svg
        viewBox={`0 0 ${CHART.width} ${compact ? CHART.axisTop : CHART.height}`}
        className="w-full touch-none"
        role="img"
        aria-labelledby={titleId}
        onPointerDown={handlePointer}
        onPointerMove={(event) => {
          if (event.buttons === 1) handlePointer(event)
        }}
      >
        <title id={titleId}>{title}</title>
        <defs>
          {/*
            No-data hatch. Colour is never the only channel that separates
            "not seen" from "seen and dark". DESIGN.md §9.
          */}
          <pattern id={hatchId} width={5} height={5} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width={5} height={5} fill="transparent" />
            <line x1={0} y1={0} x2={0} y2={5} className="stroke-nodata" strokeWidth={2} />
          </pattern>
        </defs>

        {/*
          Gridlines at quarters of the radiance axis, labelled. A trend wants
          an axis you can read values off, not just a shape. DESIGN.md §2.
        */}
        {[0, 0.25, 0.5, 0.75, 1].map((fraction) => (
          <g key={fraction}>
            <line
              x1={CHART.padLeft}
              x2={CHART.width - CHART.padRight}
              y1={CHART.lineTop + CHART.lineHeight * (1 - fraction)}
              y2={CHART.lineTop + CHART.lineHeight * (1 - fraction)}
              className="stroke-rule"
              strokeWidth={0.5}
              strokeOpacity={0.7}
            />
            <text
              x={CHART.padLeft + 2}
              y={CHART.lineTop + CHART.lineHeight * (1 - fraction) - 3}
              className="fill-muted font-mono"
              fontSize={11}
            >
              {(geometry.max * fraction).toFixed(geometry.max < 10 ? 1 : 0)}
            </text>
          </g>
        ))}

        <RadianceLine geometry={geometry} hatchId={hatchId} />
        <FlagMarkers geometry={geometry} locale={locale} />
        <ObservationBand bars={geometry.bars} hatchId={hatchId} labelledBy={bandLabelId} />
        <text id={bandLabelId} className="sr-only">
          {copy.chart.observationAxis}
        </text>

        {/* Year ticks. */}
        {geometry.yearTicks.map((tick) => (
          <g key={tick.year}>
            <line
              x1={tick.x}
              x2={tick.x}
              y1={CHART.bandTop + CHART.bandHeight}
              y2={CHART.bandTop + CHART.bandHeight + 4}
              className="stroke-rule"
              strokeWidth={1}
            />
            {!compact && tick.year % 2 === 1 ? (
              <text
                x={tick.x}
                y={CHART.axisTop + 12}
                className="fill-muted font-mono"
                fontSize={12}
                textAnchor="middle"
              >
                {tick.year}
              </text>
            ) : null}
          </g>
        ))}

        {/* The cursor crosses line and band together — one month, one glance. */}
        <line
          x1={cursorX ?? cursorFallback}
          x2={cursorX ?? cursorFallback}
          y1={CHART.lineTop}
          y2={CHART.bandTop + CHART.bandHeight}
          className="stroke-r4"
          strokeWidth={1}
          strokeOpacity={0.75}
        />
        {cursorX !== undefined && current?.type === 'observed' ? (
          <circle
            cx={cursorX}
            cy={geometry.points.find((point) => point.month === current.month)?.y ?? 0}
            r={current.adequacy === 'adequate' ? 3.5 : 2}
            className="fill-line"
            fillOpacity={current.adequacy === 'adequate' ? 1 : 0.5}
          />
        ) : null}
      </svg>

      <figcaption className="mt-2 space-y-1 text-xs text-muted">
        <p>{copy.chart.bandExplainer}</p>
        <p>{copy.chart.sparseExplainer}</p>
        <p>{copy.chart.noDataExplainer}</p>
        <p className="font-mono">
          {copy.chart.radianceAxis} · 0–{geometry.max.toFixed(1)} · {copy.chart.observationAxis} ·
          0–{BAND_CEILING}
          {current === undefined ? '' : ` · ${formatMonth(current.month, locale)}`}
        </p>
      </figcaption>
    </figure>
  )
}
