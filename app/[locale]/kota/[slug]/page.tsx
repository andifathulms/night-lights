import { notFound } from 'next/navigation'
import { CityView } from '@/components/city/CityView'
import { Nav } from '@/components/shell/Nav'
import { loadCitySeries, loadManifest } from '@/lib/data/load'
import { LOCALES, isLocale } from '@/lib/i18n'

export function generateStaticParams() {
  const manifest = loadManifest()
  return LOCALES.flatMap((locale) => manifest.cities.map((city) => ({ locale, slug: city.id })))
}

export default function CityPage({ params }: { params: { locale: string; slug: string } }) {
  if (!isLocale(params.locale)) notFound()
  const manifest = loadManifest()
  const city = manifest.cities.find((entry) => entry.id === params.slug)
  const stack = manifest.stacks.find((entry) => entry.cityId === params.slug)
  if (city === undefined || stack === undefined) notFound()

  // The series is small enough to travel with the page; only imagery is lazy.
  const series = loadCitySeries(city.id)

  return (
    <>
      <Nav locale={params.locale} current="browse" />
      <CityView
        city={city}
        series={series}
        stack={stack}
        manifest={{ months: manifest.months }}
        citations={manifest.citations}
        locale={params.locale}
      />
    </>
  )
}
