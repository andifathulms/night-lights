'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { buildChangeTable, type ChangeMetric, type EndpointAdequacy } from '@/lib/lights/change'
import { loadAllSeries } from '@/lib/client/bundle'
import { copyFor } from '@/lib/i18n/copy'
import { formatSigned, type Locale } from '@/lib/i18n'
import type { City, CitySeries } from '@/lib/lights/types'

/**
 * Cities ranked by change in lit pixel share and mean radiance between two
 * years, computed from the filtered annual composites.
 *
 * The metric is named for what it measures — light — and nothing here is
 * framed as a region doing better or worse. There is no ranking ramp on this
 * table and no red anywhere in it: the change column is one warm hue for both
 * directions, with the sign doing the work. PRD.md §5, DESIGN.md §4.
 *
 * A city whose endpoint years had poor cloud-free coverage is marked thin,
 * not silently ranked. CLAUDE.md invariant 7.
 */
export function ChangeTable({
  cities,
  years,
  locale,
}: {
  cities: readonly City[]
  years: readonly number[]
  locale: Locale
}) {
  const copy = copyFor(locale)
  const [allSeries, setAllSeries] = useState<CitySeries[] | undefined>(undefined)
  const [fromYear, setFromYear] = useState(years[0] ?? 2013)
  const [toYear, setToYear] = useState(years[years.length - 1] ?? 2025)
  const [metric, setMetric] = useState<ChangeMetric>('litRatio')

  useEffect(() => {
    let cancelled = false
    loadAllSeries().then(
      (series) => {
        if (!cancelled) setAllSeries(series)
      },
      () => undefined,
    )
    return () => {
      cancelled = true
    }
  }, [])

  const entries = useMemo(
    () => (allSeries === undefined ? [] : buildChangeTable(allSeries, fromYear, toYear, metric)),
    [allSeries, fromYear, toYear, metric],
  )

  const nameById = useMemo(
    () => new Map(cities.map((city) => [city.id, city.name])),
    [cities],
  )

  function adequacyLabel(value: EndpointAdequacy): string {
    switch (value) {
      case 'adequate':
        return copy.change.coverageAdequate
      case 'thin':
        return copy.change.coverageThin
      case 'missing':
        return copy.change.coverageMissing
      default: {
        const never: never = value
        return never
      }
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-6">
        <YearSelect
          id="from-year"
          label={copy.change.fromYear}
          years={years}
          value={fromYear}
          onChange={setFromYear}
        />
        <YearSelect
          id="to-year"
          label={copy.change.toYear}
          years={years}
          value={toYear}
          onChange={setToYear}
        />
        <fieldset className="flex gap-2">
          <legend className="sr-only">{copy.change.title}</legend>
          {(['litRatio', 'meanRadiance'] as const).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={metric === option}
              onClick={() => setMetric(option)}
              className={`rounded-sm border px-3 py-1.5 text-sm transition-colors duration-state
                ease-house ${metric === option ? 'border-line text-line' : 'border-rule text-muted hover:border-r3'}`}
            >
              {option === 'litRatio' ? copy.change.metricLitRatio : copy.change.metricRadiance}
            </button>
          ))}
        </fieldset>
      </div>

      <p className="text-sm text-muted">{copy.change.underpoweredNote}</p>

      <div className="overflow-x-auto rounded-sm border border-rule">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-panel">
            <tr className="border-b border-rule">
              <th scope="col" className="px-3 py-2 font-normal text-muted">{copy.change.columnCity}</th>
              <th scope="col" className="px-3 py-2 text-right font-normal text-muted">
                {copy.change.columnLitChange}
              </th>
              <th scope="col" className="px-3 py-2 text-right font-normal text-muted">
                {copy.change.columnRadianceChange}
              </th>
              <th scope="col" className="px-3 py-2 font-normal text-muted">
                {copy.change.columnCoverage}
              </th>
            </tr>
          </thead>
          <tbody className="font-mono text-xs">
            {entries.map((entry) => (
              <tr key={entry.cityId} className="border-b border-rule/60">
                <th scope="row" className="px-3 py-2 font-normal">
                  <Link
                    href={`/${locale}/kota/${entry.cityId}`}
                    className="transition-colors duration-fast ease-house hover:text-r4"
                  >
                    {nameById.get(entry.cityId) ?? entry.cityId}
                  </Link>
                </th>
                <td className={`tnum px-3 py-2 text-right ${entry.underpowered ? 'opacity-50' : ''}`}>
                  {formatSigned(entry.litRatioChange * 100, 1)}
                </td>
                <td className={`tnum px-3 py-2 text-right ${entry.underpowered ? 'opacity-50' : ''}`}>
                  {formatSigned(entry.meanRadianceChange, 2)}
                </td>
                <td className="px-3 py-2 text-muted">
                  {entry.underpowered ? <span className="text-flag">△ </span> : null}
                  {fromYear} {adequacyLabel(entry.fromAdequacy)} · {toYear}{' '}
                  {adequacyLabel(entry.toAdequacy)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="citation">{copy.change.interpretation}</p>
    </div>
  )
}

function YearSelect({
  id,
  label,
  years,
  value,
  onChange,
}: {
  id: string
  label: string
  years: readonly number[]
  value: number
  onChange: (year: number) => void
}) {
  return (
    <div>
      <label htmlFor={id} className="block font-mono text-xs text-muted">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="tnum mt-1 rounded-sm border border-rule bg-panel px-3 py-1.5 text-base
          text-ink outline-none transition-colors duration-fast ease-house focus:border-r3"
      >
        {years.map((year) => (
          <option key={year} value={year}>
            {year}
          </option>
        ))}
      </select>
    </div>
  )
}
