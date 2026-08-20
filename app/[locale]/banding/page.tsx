import { notFound } from 'next/navigation'
import { Compare } from '@/components/compare/Compare'
import { Nav } from '@/components/shell/Nav'
import { COMPARE_PRESET } from '@/data/cities'
import { loadManifest } from '@/lib/data/load'
import { LOCALES, isLocale } from '@/lib/i18n'
import { copyFor } from '@/lib/i18n/copy'

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }))
}

export default function ComparePage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound()
  const copy = copyFor(params.locale)
  const manifest = loadManifest()

  return (
    <>
      <Nav locale={params.locale} current="compare" />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <h1 className="text-2xl">{copy.compare.title}</h1>
        <p className="mt-3 max-w-3xl text-base text-muted">{copy.compare.lede}</p>
        <div className="mt-8">
          <Compare cities={manifest.cities} preset={COMPARE_PRESET} locale={params.locale} />
        </div>
      </main>
    </>
  )
}
