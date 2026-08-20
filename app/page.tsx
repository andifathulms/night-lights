import Link from 'next/link'
import { LOCALES, DEFAULT_LOCALE } from '@/lib/i18n'
import { copyFor } from '@/lib/i18n/copy'

/**
 * The export has no server to redirect, so the root is a real page that
 * happens to move on immediately. It stays readable if the refresh is
 * blocked, which is the whole reason it is not a bare script.
 */
export default function RootPage() {
  const copy = copyFor(DEFAULT_LOCALE)
  return (
    <>
      <meta httpEquiv="refresh" content={`0; url=./${DEFAULT_LOCALE}/`} />
      <main className="mx-auto max-w-2xl px-4 py-24">
        <h1 className="font-display text-2xl">{copy.siteName}</h1>
        <p className="mt-4 text-md text-muted">{copy.tagline}</p>
        <ul className="mt-8 flex gap-6">
          {LOCALES.map((locale) => (
            <li key={locale}>
              <Link href={`/${locale}`} className="text-line underline underline-offset-4">
                {locale === 'id' ? 'Bahasa Indonesia' : 'English'}
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </>
  )
}
