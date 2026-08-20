import { copyFor } from '@/lib/i18n/copy'
import { formatMonth, type Locale } from '@/lib/i18n'
import type { Citation } from '@/lib/data/schema'
import type { LayerKind } from '@/lib/lights/types'

/**
 * The honesty contract. Never optional, and it always states four things:
 * which composite family is on screen and whether it is filtered, what the
 * observation band means, that no-data and dark are different, and the
 * composite period with its citation. DESIGN.md §8.
 *
 * The third point is the one that matters most, and it is why both swatches
 * appear here rather than only in the chart.
 */
export function Legend({
  locale,
  layer,
  product,
  fromMonth,
  toMonth,
  citations,
}: {
  locale: Locale
  layer: LayerKind
  product: string
  fromMonth: string
  toMonth: string
  citations: readonly Citation[]
}) {
  const copy = copyFor(locale)

  return (
    <aside className="panel p-4" aria-label={copy.legend.title}>
      <h2 className="text-base font-medium">{copy.legend.title}</h2>

      <p className="mt-3 font-mono text-xs text-muted">{copy.legend.layerLine(product)}</p>
      <p className="mt-2 text-xs leading-relaxed">
        {layer === 'monthly-unfiltered' ? copy.legend.monthlyUnfiltered : copy.legend.annualFiltered}
      </p>

      <p className="mt-3 text-xs leading-relaxed">{copy.legend.bandMeaning}</p>

      <ul className="mt-4 space-y-2 text-xs">
        <li className="flex items-center gap-2">
          <span aria-hidden className="h-3 w-6 shrink-0 rounded-sm border border-rule bg-r1" />
          {copy.legend.darkSwatch}
        </li>
        <li className="flex items-center gap-2">
          {/* Hatch as well as grey: colour is never the only channel. */}
          <span aria-hidden className="hatch-nodata h-3 w-6 shrink-0 rounded-sm border border-rule" />
          {copy.legend.noDataSwatch}
        </li>
        <li className="flex items-center gap-2">
          <span aria-hidden className="w-6 shrink-0 text-center font-mono text-flag">△ ◇</span>
          {copy.legend.flagSwatch}
        </li>
      </ul>

      <p className="citation mt-4">
        {copy.legend.period(formatMonth(fromMonth, locale), formatMonth(toMonth, locale))}
      </p>
      <ul className="citation mt-2 space-y-1">
        {citations.map((citation) => (
          <li key={citation.label}>{citation.text}</li>
        ))}
      </ul>
    </aside>
  )
}
