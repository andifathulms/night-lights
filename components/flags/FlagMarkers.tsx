import { CHART, type ChartGeometry } from '@/lib/chart/geometry'
import { flagLabel } from '@/lib/lights/divergence'
import type { Locale } from '@/lib/i18n'

/**
 * Contamination markers on the timeline.
 *
 * Each marker carries a glyph as well as its colour — △ for fire divergence,
 * ◇ for offshore — because colour is never the only channel. DESIGN.md §9.
 * The markers themselves come from the computed divergence; nothing here
 * decides that a month is contaminated.
 */
export function FlagMarkers({
  geometry,
  locale,
}: {
  geometry: ChartGeometry
  locale: Locale
}) {
  return (
    <g>
      {geometry.flagMarks.map((mark) => {
        const label = flagLabel(mark.reason)
        return (
          <g key={`${mark.month}-${mark.reason}`}>
            <title>{`${mark.month} — ${label[locale]}`}</title>
            <text
              x={mark.x}
              y={CHART.lineTop - 1}
              className="fill-flag"
              fontSize={11}
              textAnchor="middle"
            >
              {label.glyph}
            </text>
            <line
              x1={mark.x}
              x2={mark.x}
              y1={CHART.lineTop + 2}
              y2={CHART.lineTop + CHART.lineHeight}
              className="stroke-flag"
              strokeWidth={0.75}
              strokeOpacity={0.28}
            />
          </g>
        )
      })}
    </g>
  )
}
