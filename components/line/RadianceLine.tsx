import { CHART, type ChartGeometry } from '@/lib/chart/geometry'

/**
 * The radiance line. The brightest thing on screen, and the only warm colour
 * in the chart. DESIGN.md §2.
 *
 * Drawn as one path per month-pair rather than a single path, because stroke
 * weight has to vary along it: months carried by few cloud-free observations
 * render visibly weaker so a low-confidence spike cannot look like a finding.
 * CLAUDE.md invariant 3.
 */
export function RadianceLine({
  geometry,
  hatchId,
}: {
  geometry: ChartGeometry
  hatchId: string
}) {
  return (
    <g>
      {geometry.noDataColumns.map((column) => (
        <rect
          key={`gap-${column.month}`}
          x={column.x}
          y={CHART.lineTop}
          width={column.width}
          height={CHART.lineHeight}
          fill={`url(#${hatchId})`}
          opacity={0.55}
        />
      ))}
      {geometry.segments.map((segment) => (
        <path
          key={`${segment.fromMonth}-${segment.toMonth}`}
          d={segment.d}
          className="stroke-line"
          fill="none"
          strokeWidth={segment.adequacy === 'adequate' ? 2 : 1}
          strokeOpacity={segment.adequacy === 'adequate' ? 1 : 0.4}
          strokeLinecap="round"
        />
      ))}
    </g>
  )
}
