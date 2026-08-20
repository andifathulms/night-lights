import { BAND_CEILING, CHART, type BandBar } from '@/lib/chart/geometry'

/**
 * The cloud-free observation band.
 *
 * This component exists before the line does, and the layout is built around
 * it rather than making room for it afterwards. It sits directly under the
 * radiance line on the same x axis, always visible — not in a tooltip, not on
 * a tab. Confidence and value are read in one glance or the design has
 * failed. DESIGN.md §3.
 */
export function ObservationBand({
  bars,
  hatchId,
  labelledBy,
}: {
  bars: readonly BandBar[]
  hatchId: string
  labelledBy: string
}) {
  return (
    <g aria-labelledby={labelledBy}>
      <line
        x1={CHART.padLeft}
        x2={CHART.width - CHART.padRight}
        y1={CHART.bandTop + CHART.bandHeight}
        y2={CHART.bandTop + CHART.bandHeight}
        className="stroke-rule"
        strokeWidth={1}
      />
      {bars.map((bar) =>
        bar.state === 'no-data' ? (
          // Full-height hatch, not an empty slot. An empty slot reads as zero
          // nights observed *and* zero light; the hatch says the month has no
          // measurement in it at all.
          <rect
            key={bar.month}
            x={bar.x}
            y={bar.y}
            width={bar.width}
            height={bar.height}
            fill={`url(#${hatchId})`}
            stroke="none"
          />
        ) : (
          <rect
            key={bar.month}
            x={bar.x + 0.35}
            y={bar.y}
            width={Math.max(bar.width - 0.7, 0.6)}
            height={bar.height}
            className="fill-confidence"
            opacity={0.85}
          />
        ),
      )}
      <text
        x={CHART.padLeft + 2}
        y={CHART.bandTop - 4}
        className="fill-muted font-mono"
        fontSize={11}
      >
        {BAND_CEILING}
      </text>
    </g>
  )
}
