import { notFound } from 'next/navigation'
import { Browse } from '@/components/overview/Browse'
import { Nav } from '@/components/shell/Nav'
import { loadManifest } from '@/lib/data/load'
import { LOCALES, isLocale } from '@/lib/i18n'
import { copyFor } from '@/lib/i18n/copy'

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }))
}

export default function OverviewPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound()
  const locale = params.locale
  const copy = copyFor(locale)
  const manifest = loadManifest()

  return (
    <>
      <Nav locale={locale} current="browse" />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <h1 className="text-2xl">{copy.siteName}</h1>
        <p className="mt-3 max-w-3xl text-md text-muted">{copy.tagline}</p>
        <p className="mt-6 max-w-3xl text-base">{copy.overview.lede}</p>
        <div className="mt-8">
          <Browse cities={manifest.cities} overview={manifest.overview} locale={locale} />
        </div>
      </main>
    </>
  )
}
