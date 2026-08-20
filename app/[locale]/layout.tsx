import { notFound } from 'next/navigation'
import { Footer } from '@/components/shell/Footer'
import { Provenance } from '@/components/shell/Provenance'
import { loadManifest } from '@/lib/data/load'
import { LOCALES, isLocale } from '@/lib/i18n'

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }))
}

export default function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { locale: string }
}) {
  if (!isLocale(params.locale)) notFound()
  const manifest = loadManifest()

  return (
    <div className="flex min-h-screen flex-col">
      <Provenance provenance={manifest.provenance} locale={params.locale} />
      {children}
      <Footer locale={params.locale} citations={manifest.citations} />
    </div>
  )
}
