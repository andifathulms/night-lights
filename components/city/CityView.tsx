'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { CityChart } from '@/components/chart/CityChart'
import { ImageStack } from '@/components/stack/ImageStack'
import { SmallMultiples } from '@/components/stack/SmallMultiples'
import { Scrubber } from '@/components/scrubber/Scrubber'
import { SeriesTable } from '@/components/table/SeriesTable'
import { Legend } from '@/components/legend/Legend'
import { flagLabel } from '@/lib/lights/divergence'
import { summariseCoverage } from '@/lib/lights/series'
import { windowSpanKm } from '@/lib/chart/project'
import { copyFor } from '@/lib/i18n/copy'
import { formatMonth, formatRadiance, formatRatio, type Locale } from '@/lib/i18n'
import type { Citation, Manifest, StackEntry } from '@/lib/data/schema'
import type { City, CitySeries } from '@/lib/lights/types'

/**
 * The signature screen: image stack, radiance line, observation band, all on
 * one time axis, all moved by one scrubber. DESIGN.md §6.
 *
 * Playback is the app's single orchestrated moment — the stack advances while
 * the scrubber, the readouts and the cursor move with it, about twenty
 * seconds for the whole fourteen years, slow enough to watch a place change.
 * DESIGN.md §7. Everything else on this screen is a state change.
 */

/** Full series in roughly twenty seconds, whatever its length. */
const PLAYBACK_TOTAL_MS = 20_000

export function CityView({
  city,
  series,
  stack,
  manifest,
  citations,
  locale,
}: {
  city: City
  series: CitySeries
  stack: StackEntry
  manifest: Pick<Manifest, 'months'>
  citations: readonly Citation[]
  locale: Locale
}) {
  const copy = copyFor(locale)
  const [index, setIndex] = useState(series.months.length - 1)
  const [playing, setPlaying] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [showMultiples, setShowMultiples] = useState(false)
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined)

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const apply = (): void => {
      setReducedMotion(query.matches)
      // The complete alternative, offered up front rather than hidden behind
      // a control the reader has to find. DESIGN.md §7.
      if (query.matches) setShowMultiples(true)
    }
    apply()
    query.addEventListener('change', apply)
    return () => query.removeEventListener('change', apply)
  }, [])

  useEffect(() => {
    if (!playing) return
    const step = Math.max(60, Math.round(PLAYBACK_TOTAL_MS / series.months.length))
    timer.current = setInterval(() => {
      setIndex((previous) => {
        if (previous + 1 >= series.months.length) {
          setPlaying(false)
          return previous
        }
        return previous + 1
      })
    }, step)
    return () => {
      if (timer.current !== undefined) clearInterval(timer.current)
    }
  }, [playing, series.months.length])

  const current = series.months[index]
  const coverage = useMemo(() => summariseCoverage(series.months), [series.months])
  const flagForMonth = series.flags.find((flag) => flag.month === current?.month)
  const months = useMemo(() => series.months.map((record) => record.month), [series.months])

  function play(): void {
    if (index >= series.months.length - 1) setIndex(0)
    setPlaying((previous) => !previous)
  }

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
      <Link
        href={`/${locale}/jelajah`}
        className="font-mono text-xs text-muted transition-colors duration-fast ease-house hover:text-r4"
      >
        ← {copy.city.backToBrowse}
      </Link>

      <h1 className="mt-3 text-3xl">{city.name}</h1>
      <p className="mt-1 font-mono text-xs text-muted">
        {copy.city.province}: {city.province} · {copy.city.window}:{' '}
        {copy.city.windowValue(windowSpanKm(city.window))}
      </p>
      {city.note === undefined ? null : (
        <p className="mt-3 max-w-2xl text-base text-muted">{city.note[locale]}</p>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <div className="max-h-[40vh] lg:max-h-none">
            <ImageStack
              geometry={stack.geometry}
              radiancePath={stack.radiancePath}
              observationsPath={stack.observationsPath}
              index={index}
              alt={`${city.name} — ${current === undefined ? '' : formatMonth(current.month, locale)}`}
              loadingLabel="…"
            />
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={play}
              aria-pressed={playing}
              className="rounded-sm border border-rule bg-panel px-4 py-2 text-base
                transition-colors duration-state ease-house hover:border-r3"
            >
              {playing ? copy.city.pause : copy.city.play}
            </button>
            <Scrubber
              id="city-scrubber"
              months={months}
              index={index}
              onIndex={(next) => {
                setPlaying(false)
                setIndex(next)
              }}
              label={copy.city.scrubberLabel}
              locale={locale}
            />
          </div>
        </div>

        {/* Readouts. Radiance never appears without the count beneath it. */}
        <aside className="panel space-y-4 p-4">
          <div>
            <p className="font-mono text-xs text-muted">{copy.city.currentMonth}</p>
            <output className="block font-display text-xl text-ink">
              {current === undefined ? '' : formatMonth(current.month, locale)}
            </output>
          </div>

          {current?.type === 'observed' ? (
            <>
              <Readout
                label={copy.city.meanRadiance}
                value={formatRadiance(current.meanRadiance)}
                unit={copy.city.meanRadianceUnit}
                dimmed={current.adequacy === 'sparse'}
              />
              <Readout
                label={copy.city.litRatio}
                value={formatRatio(current.litRatio)}
                dimmed={current.adequacy === 'sparse'}
              />
            </>
          ) : (
            <p className="hatch-nodata rounded-sm border border-rule p-3 text-sm">
              <span className="bg-night px-1 font-mono text-nodata">{copy.city.noDataMonth}</span>{' '}
              <span className="bg-night">{copy.city.noDataReadout}</span>
            </p>
          )}

          <Readout
            label={copy.city.observations}
            value={String(current?.observations ?? 0)}
            unit={copy.city.observationsUnit}
            accent
            note={
              current?.type === 'observed'
                ? current.adequacy === 'sparse'
                  ? copy.city.adequacySparse
                  : copy.city.adequacyAdequate
                : copy.legend.noDataSwatch
            }
          />

          {flagForMonth === undefined ? null : (
            <p className="rounded-sm border border-flag/40 bg-flag/10 p-3 text-sm">
              <span className="font-mono text-flag">{flagLabel(flagForMonth.reason).glyph}</span>{' '}
              {flagLabel(flagForMonth.reason)[locale]}
            </p>
          )}

          <p className="citation">
            {copy.city.coverage(coverage.adequateMonths, coverage.sparseMonths, coverage.noDataMonths)}
          </p>
        </aside>
      </div>

      <section className="mt-8">
        <CityChart
          months={series.months}
          flags={series.flags}
          index={index}
          onIndex={(next) => {
            setPlaying(false)
            setIndex(next)
          }}
          locale={locale}
          title={`${city.name} — ${copy.chart.radianceAxis}`}
        />
      </section>

      <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section>
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="text-lg">{copy.city.smallMultiples}</h2>
            {reducedMotion ? null : (
              <button
                type="button"
                onClick={() => setShowMultiples((previous) => !previous)}
                className="font-mono text-xs text-muted transition-colors duration-fast ease-house hover:text-r4"
              >
                {showMultiples ? '−' : '+'}
              </button>
            )}
          </div>
          <p className="mt-1 text-xs text-muted">{copy.city.smallMultiplesHint}</p>
          {showMultiples ? (
            <div className="mt-4">
              <SmallMultiples
                geometry={stack.geometry}
                radiancePath={stack.radiancePath}
                observationsPath={stack.observationsPath}
                months={series.months}
                locale={locale}
                onSelect={(next) => {
                  setPlaying(false)
                  setIndex(next)
                }}
              />
            </div>
          ) : null}
        </section>

        <Legend
          locale={locale}
          layer="monthly-unfiltered"
          product={copy.city.layerMonthly}
          fromMonth={manifest.months[0] ?? ''}
          toMonth={manifest.months[manifest.months.length - 1] ?? ''}
          citations={citations}
        />
      </div>

      <section className="mt-10">
        <h2 className="text-lg">{copy.city.flagsTitle}</h2>
        {series.flags.length === 0 ? (
          <p className="mt-2 text-base text-muted">{copy.city.flagsNone}</p>
        ) : (
          <ul className="mt-3 space-y-1 font-mono text-xs">
            {series.flags.map((flag) => (
              <li key={`${flag.month}-${flag.reason}`}>
                <button
                  type="button"
                  onClick={() => setIndex(months.indexOf(flag.month))}
                  className="text-left transition-colors duration-fast ease-house hover:text-r4"
                >
                  <span className="text-flag">{flagLabel(flag.reason).glyph}</span>{' '}
                  {formatMonth(flag.month, locale)} · ×{flag.ratio.toFixed(1)} ·{' '}
                  <span className="text-muted">{flagLabel(flag.reason)[locale]}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-lg">{copy.city.tableTitle}</h2>
        <p className="mt-1 text-xs text-muted">{copy.city.tableHint}</p>
        <div className="mt-3">
          <SeriesTable
            months={series.months}
            flags={series.flags}
            locale={locale}
            {...(current === undefined ? {} : { currentMonth: current.month })}
          />
        </div>
      </section>
    </main>
  )
}

function Readout({
  label,
  value,
  unit,
  note,
  accent = false,
  dimmed = false,
}: {
  label: string
  value: string
  unit?: string
  note?: string
  accent?: boolean
  dimmed?: boolean
}) {
  return (
    <div>
      <p className="font-mono text-xs text-muted">{label}</p>
      <output
        className={`tnum block font-display text-xl transition-opacity duration-frame ease-house ${
          accent ? 'text-confidence' : 'text-line'
        } ${dimmed ? 'opacity-50' : ''}`}
      >
        {value}
        {unit === undefined ? null : <span className="ml-1 font-mono text-xs text-muted">{unit}</span>}
      </output>
      {note === undefined ? null : <p className="font-mono text-xs text-muted">{note}</p>}
    </div>
  )
}
