import { notFound } from 'next/navigation'
import { Nav } from '@/components/shell/Nav'
import { loadManifest } from '@/lib/data/load'
import { ADEQUATE_MIN_OBSERVATIONS } from '@/lib/lights/adequacy'
import { DIVERGENCE_RATIO_THRESHOLD } from '@/lib/lights/divergence'
import { LIT_THRESHOLD_RADIANCE } from '@/lib/lights/series'
import { LOCALES, isLocale } from '@/lib/i18n'
import { copyFor } from '@/lib/i18n/copy'

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }))
}

/**
 * The method page. Dataset versions, the EOG citation, the observation-count
 * requirement, monthly-versus-annual filtering, the contamination sources,
 * the size constraint, and what light does not measure — in full. PRD.md §7.7.
 *
 * The numbers in the parameter table are read from the code that uses them,
 * so the page cannot describe thresholds the site is not applying.
 */
export default function MethodPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound()
  const locale = params.locale
  const copy = copyFor(locale)
  const manifest = loadManifest()

  const parameters = [
    { label: 'adequacy.minObservations', value: String(ADEQUATE_MIN_OBSERVATIONS) },
    { label: 'divergence.ratioThreshold', value: DIVERGENCE_RATIO_THRESHOLD.toFixed(2) },
    { label: 'litThresholdRadiance', value: `${LIT_THRESHOLD_RADIANCE} nW/cm²/sr` },
    { label: 'radianceScale', value: `sqrt, 0–${manifest.scales.radiance.maxRadiance}, 255 codes` },
    {
      label: 'observationScale',
      value: `linear, 0–${manifest.scales.observations.maxObservations}, 255 codes`,
    },
    { label: 'months', value: `${manifest.months.length} (${manifest.months[0]} → ${manifest.months[manifest.months.length - 1]})` },
    { label: 'cities', value: String(manifest.cities.length) },
    { label: 'provenance', value: manifest.provenance.kind },
    { label: 'sourceVersion', value: manifest.generatedFromSourceVersion },
  ]

  return (
    <>
      <Nav locale={locale} current="method" />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <h1 className="text-2xl">{copy.method.title}</h1>

        {copy.method.sections.map((section) => (
          <section key={section.heading} className="mt-10">
            <h2 className="text-lg">{section.heading}</h2>
            {section.body.map((paragraph) => (
              <p key={paragraph.slice(0, 40)} className="mt-3 text-base leading-relaxed">
                {paragraph}
              </p>
            ))}
          </section>
        ))}

        <section className="mt-10">
          <h2 className="text-lg">Parameter</h2>
          <table className="mt-3 w-full border-collapse text-left font-mono text-xs">
            <tbody>
              {parameters.map((parameter) => (
                <tr key={parameter.label} className="border-b border-rule/60">
                  <th scope="row" className="py-2 pr-4 font-normal text-muted">
                    {parameter.label}
                  </th>
                  <td className="tnum py-2">{parameter.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="mt-10">
          <h2 className="text-lg">{copy.provenance.eogTitle}</h2>
          <p className="mt-3 font-mono text-xs text-muted">{manifest.provenance.monthlyProduct}</p>
          <p className="font-mono text-xs text-muted">{manifest.provenance.annualProduct}</p>
          {manifest.provenance.caveat === undefined ? null : (
            <p className="mt-3 rounded-sm border border-flag/40 bg-flag/10 p-3 text-sm">
              {manifest.provenance.caveat}
            </p>
          )}
          <ul className="citation mt-4 space-y-2">
            {manifest.citations.map((citation) => (
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
        </section>
      </main>
    </>
  )
}
