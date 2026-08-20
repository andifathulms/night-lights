'use client'

import { useEffect, useMemo, useState } from 'react'
import { CityChart } from '@/components/chart/CityChart'
import { Scrubber } from '@/components/scrubber/Scrubber'
import { loadAllSeries } from '@/lib/client/bundle'
import { radianceExtent } from '@/lib/lights/series'
import { copyFor } from '@/lib/i18n/copy'
import { formatMonth, formatRadiance, type Locale } from '@/lib/i18n'
import type { City, CitySeries } from '@/lib/lights/types'

/**
 * Two to four cities on one radiance axis.
 *
 * Each city keeps its own observation band directly beneath its own line.
 * The bands are never merged: confidence is per city per month, and a merged
 * band would hide exactly the case that matters — one city's month carried by
 * twenty cloud-free nights sitting beside another's carried by two.
 * CLAUDE.md invariant 13, DESIGN.md §6.
 */

const MAX_CITIES = 4

export function Compare({
  cities,
  preset,
  locale,
}: {
  cities: readonly City[]
  preset: readonly string[]
  locale: Locale
}) {
  const copy = copyFor(locale)
  const [selected, setSelected] = useState<string[]>([...preset])
  const [allSeries, setAllSeries] = useState<CitySeries[] | undefined>(undefined)
  const [index, setIndex] = useState(0)

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

  const chosen = useMemo(
    () =>
      selected
        .map((id) => allSeries?.find((series) => series.cityId === id))
        .filter((series): series is CitySeries => series !== undefined),
    [selected, allSeries],
  )

  // One radiance axis across every compared city, so the lines are readable
  // against each other rather than each against its own scale.
  const sharedMax = useMemo(() => {
    const maxima = chosen.map((series) => radianceExtent(series.months).max)
    return maxima.length === 0 ? undefined : Math.max(...maxima) * 1.08
  }, [chosen])

  const months = chosen[0]?.months.map((record) => record.month) ?? []

  useEffect(() => {
    if (months.length > 0 && index === 0) setIndex(months.length - 1)
  }, [months.length, index])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        {cities.map((city) => {
          const active = selected.includes(city.id)
          const full = selected.length >= MAX_CITIES
          return (
            <button
              key={city.id}
              type="button"
              aria-pressed={active}
              disabled={!active && full}
              onClick={() =>
                setSelected((previous) =>
                  previous.includes(city.id)
                    ? previous.filter((id) => id !== city.id)
                    : previous.length >= MAX_CITIES
                      ? previous
                      : [...previous, city.id],
                )
              }
              className={`rounded-sm border px-2 py-1 font-mono text-xs transition-colors
                duration-state ease-house disabled:opacity-30 ${
                  active ? 'border-line text-line' : 'border-rule text-muted hover:border-r3'
                }`}
            >
              {city.name}
            </button>
          )
        })}
      </div>

      {selected.length >= MAX_CITIES ? (
        <p className="font-mono text-xs text-muted">{copy.compare.limitReached}</p>
      ) : null}
      <p className="text-xs text-muted lg:hidden">{copy.compare.mobileLimit}</p>

      {months.length > 0 ? (
        <div className="flex items-center gap-4">
          <output className="tnum shrink-0 font-mono text-md text-line">
            {formatMonth(months[index] ?? '', locale)}
          </output>
          <Scrubber
            id="compare-scrubber"
            months={months}
            index={index}
            onIndex={setIndex}
            label={copy.compare.title}
            locale={locale}
          />
        </div>
      ) : null}

      <div className="space-y-10">
        {chosen.map((series, position) => {
          const city = cities.find((entry) => entry.id === series.cityId)
          const record = series.months[index]
          // On a small screen the comparison is limited to two cities.
          const hiddenOnMobile = position >= 2 ? 'hidden lg:block' : ''
          return (
            <section key={series.cityId} className={hiddenOnMobile}>
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h2 className="text-lg">{city?.name ?? series.cityId}</h2>
                <p className="tnum font-mono text-xs text-muted">
                  {record?.type === 'observed'
                    ? `${formatRadiance(record.meanRadiance)} ${copy.city.meanRadianceUnit} · ${record.observations} ${copy.city.observationsUnit}`
                    : `${copy.city.noDataMonth} · 0 ${copy.city.observationsUnit}`}
                </p>
              </div>
              <CityChart
                months={series.months}
                flags={series.flags}
                index={index}
                onIndex={setIndex}
                locale={locale}
                title={`${city?.name ?? series.cityId} — ${copy.chart.radianceAxis}`}
                {...(sharedMax === undefined ? {} : { maxRadiance: sharedMax })}
                compact
              />
            </section>
          )
        })}
      </div>

      <p className="citation">{copy.compare.bandNote}</p>
    </div>
  )
}
