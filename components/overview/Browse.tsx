'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { NationalMap } from './NationalMap'
import { copyFor } from '@/lib/i18n/copy'
import type { Locale } from '@/lib/i18n'
import type { City } from '@/lib/lights/types'

/**
 * Overview: map, search, city list. Two interactions from arriving to
 * watching a city light up — pick a city here, press play there. PRD.md §11.
 */
export function Browse({
  cities,
  overview,
  locale,
}: {
  cities: readonly City[]
  overview: {
    years: readonly number[]
    width: number
    height: number
    bounds: { west: number; south: number; east: number; north: number }
    path: string
  }
  locale: Locale
}) {
  const copy = copyFor(locale)
  const [query, setQuery] = useState('')
  const [year, setYear] = useState(overview.years[overview.years.length - 1] ?? 0)
  const [hovered, setHovered] = useState<string | undefined>(undefined)

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (needle === '') return cities
    return cities.filter(
      (city) =>
        city.name.toLowerCase().includes(needle) ||
        city.province.toLowerCase().includes(needle) ||
        city.id.includes(needle),
    )
  }, [cities, query])

  return (
    <div className="grid gap-8 lg:grid-cols-[3fr_2fr]">
      <div className="space-y-3">
        <NationalMap
          cities={cities}
          bounds={overview.bounds}
          width={overview.width}
          height={overview.height}
          years={overview.years}
          year={year}
          path={overview.path}
          locale={locale}
          {...(hovered === undefined ? {} : { highlighted: hovered })}
        />
        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor="overview-year" className="font-mono text-xs text-muted">
            {copy.overview.yearLabel}
          </label>
          <input
            id="overview-year"
            type="range"
            min={0}
            max={overview.years.length - 1}
            step={1}
            value={Math.max(overview.years.indexOf(year), 0)}
            onChange={(event) => setYear(overview.years[Number(event.target.value)] ?? year)}
            className="h-6 max-w-xs flex-1 cursor-pointer appearance-none bg-transparent
              [&::-webkit-slider-runnable-track]:h-[2px] [&::-webkit-slider-runnable-track]:bg-rule
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:mt-[-7px]
              [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-[3px]
              [&::-webkit-slider-thumb]:bg-line
              [&::-moz-range-track]:h-[2px] [&::-moz-range-track]:bg-rule
              [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-[3px] [&::-moz-range-thumb]:border-0
              [&::-moz-range-thumb]:bg-line"
          />
          <output className="tnum font-mono text-md text-line">{year}</output>
        </div>
        <p className="citation">{copy.overview.mapCaption}</p>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="city-search" className="block text-sm text-muted">
            {copy.overview.searchLabel}
          </label>
          <input
            id="city-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={copy.overview.searchPlaceholder}
            className="mt-2 w-full rounded-sm border border-rule bg-panel px-3 py-2 text-base
              text-ink outline-none transition-colors duration-fast ease-house
              placeholder:text-muted focus:border-r3"
          />
          <p className="mt-2 font-mono text-xs text-muted">
            {copy.overview.cityCount(matches.length)}
          </p>
        </div>

        {matches.length === 0 ? (
          <p className="text-sm text-muted">{copy.overview.noMatches}</p>
        ) : (
          <ul className="max-h-[32rem] divide-y divide-rule overflow-auto rounded-sm border border-rule">
            {matches.map((city) => (
              <li key={city.id}>
                <Link
                  href={`/${locale}/kota/${city.id}`}
                  onMouseEnter={() => setHovered(city.id)}
                  onMouseLeave={() => setHovered(undefined)}
                  onFocus={() => setHovered(city.id)}
                  onBlur={() => setHovered(undefined)}
                  className="flex items-baseline justify-between gap-4 px-3 py-2
                    transition-colors duration-fast ease-house hover:bg-panel focus:bg-panel"
                >
                  <span className="text-base">{city.name}</span>
                  <span className="font-mono text-xs text-muted">{city.province}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
