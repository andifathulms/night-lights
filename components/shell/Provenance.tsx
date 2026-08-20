import { copyFor } from '@/lib/i18n/copy'
import type { Locale } from '@/lib/i18n'
import type { Provenance as ProvenanceRecord } from '@/lib/data/schema'

/**
 * What the numbers on this page came from.
 *
 * A bundle built from the stand-in provider says so wherever it is rendered.
 * A site that looked like a measurement and was not one would be worse than
 * no site, so this is a banner rather than a footnote.
 */
export function Provenance({
  provenance,
  locale,
}: {
  provenance: ProvenanceRecord
  locale: Locale
}) {
  const copy = copyFor(locale)

  if (provenance.kind === 'synthetic') {
    return (
      <div className="border-y border-flag/40 bg-flag/10 px-4 py-3">
        <p className="mx-auto max-w-6xl text-sm">
          <span className="font-mono text-flag">▲ {copy.provenance.syntheticTitle}</span>{' '}
          <span className="text-muted">{provenance.caveat}</span>
        </p>
      </div>
    )
  }

  return (
    <p className="citation mx-auto max-w-6xl px-4 py-2">
      {copy.provenance.eogTitle}: {provenance.monthlyProduct} · {provenance.annualProduct}
    </p>
  )
}
