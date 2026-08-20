import { notFound } from 'next/navigation'
import { ChangeTable } from '@/components/change/ChangeTable'
import { Nav } from '@/components/shell/Nav'
import { loadManifest } from '@/lib/data/load'
import { LOCALES, isLocale } from '@/lib/i18n'
import { copyFor } from '@/lib/i18n/copy'

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }))
}

export default function ChangePage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound()
  const copy = copyFor(params.locale)
  const manifest = loadManifest()

  return (
    <>
      <Nav locale={params.locale} current="change" />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <h1 className="text-2xl">{copy.change.title}</h1>
        <p className="mt-3 max-w-3xl text-base text-muted">{copy.change.lede}</p>
        <div className="mt-8">
          <ChangeTable cities={manifest.cities} years={manifest.years} locale={params.locale} />
        </div>
      </main>
    </>
  )
}
