import { copyFor } from '@/lib/i18n/copy'
import type { Locale } from '@/lib/i18n'
import type { Citation } from '@/lib/data/schema'

/** Attribution is structural, not a footer courtesy. CLAUDE.md invariant 14. */
export function Footer({ locale, citations }: { locale: Locale; citations: readonly Citation[] }) {
  const copy = copyFor(locale)
  return (
    <footer className="mt-16 border-t border-rule">
      <div className="mx-auto max-w-6xl space-y-3 px-4 py-8">
        <p className="text-sm text-muted">{copy.footerNote}</p>
        <ul className="citation space-y-1">
          {citations.map((citation) => (
            <li key={citation.label}>
              {citation.url === undefined ? (
                citation.text
              ) : (
                <a href={citation.url} className="underline decoration-rule underline-offset-2 hover:text-r4">
                  {citation.text}
                </a>
              )}
            </li>
          ))}
        </ul>
      </div>
    </footer>
  )
}
