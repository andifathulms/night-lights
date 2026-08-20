import { readFileSync, statSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'
import { citySeriesSchema, manifestSchema } from '@/lib/data/schema'
import { CITIES, cityById } from '@/data/cities'
import { ADEQUATE_MIN_OBSERVATIONS } from '@/lib/lights/adequacy'
import { buildChangeTable } from '@/lib/lights/change'
import { BUDGET, MONTHS, OUT_ROOT } from '@/scripts/config'
import type { CitySeries } from '@/lib/lights/types'

/**
 * Assertions against the emitted bundle rather than against the functions
 * that emitted it. Everything the site actually loads passes through here.
 */

const bundleExists = existsSync(join(OUT_ROOT, 'manifest.json'))

beforeAll(() => {
  if (!bundleExists) {
    throw new Error('no bundle under public/data — run `pnpm data:build` before the integrity suite')
  }
})

const manifest = bundleExists
  ? manifestSchema.parse(JSON.parse(readFileSync(join(OUT_ROOT, 'manifest.json'), 'utf8')))
  : undefined
const allSeries: CitySeries[] = bundleExists
  ? (JSON.parse(readFileSync(join(OUT_ROOT, 'series', 'all.json'), 'utf8')) as CitySeries[])
  : []

describe('the shipped series', () => {
  it('covers every city and every month', () => {
    expect(allSeries).toHaveLength(CITIES.length)
    for (const series of allSeries) {
      expect(series.months.map((record) => record.month)).toEqual([...MONTHS])
    }
  })

  it('validates against the schema, city by city', () => {
    for (const series of allSeries) {
      expect(citySeriesSchema.safeParse(series).success).toBe(true)
    }
  })

  it('carries an observation count on every single record', () => {
    for (const series of allSeries) {
      for (const record of series.months) {
        expect(record).toHaveProperty('observations')
        expect(Number.isInteger(record.observations)).toBe(true)
        if (record.type === 'observed') expect(record.observations).toBeGreaterThan(0)
        else expect(record.observations).toBe(0)
      }
    }
  })

  it('classifies adequacy consistently with the stated threshold', () => {
    for (const series of allSeries) {
      for (const record of series.months) {
        if (record.type !== 'observed') continue
        expect(record.adequacy).toBe(
          record.observations >= ADEQUATE_MIN_OBSERVATIONS ? 'adequate' : 'sparse',
        )
      }
    }
  })

  it('contains months the satellite could not see, in more than one city', () => {
    // If a build ever produced no no-data months at all, the case this whole
    // design exists for would be going untested by the site itself.
    const withGaps = allSeries.filter((series) =>
      series.months.some((record) => record.type === 'no-data'),
    )
    expect(withGaps.length).toBeGreaterThan(1)
  })
})

describe('grid integrity', () => {
  it('matches every stack to its city window', () => {
    for (const stack of manifest?.stacks ?? []) {
      const city = cityById(stack.cityId)
      expect(city).toBeDefined()
      expect(stack.geometry.tileWidth).toBe(city?.window.widthPx)
      expect(stack.geometry.tileHeight).toBe(city?.window.heightPx)
      expect(stack.geometry.tiles).toBe(MONTHS.length)
      expect(stack.months).toEqual([...MONTHS])
    }
  })

  it('gives every city the same window size, so cities are comparable', () => {
    const sizes = new Set(CITIES.map((city) => `${city.window.widthPx}x${city.window.heightPx}`))
    expect(sizes.size).toBe(1)
    const spans = new Set(
      CITIES.map((city) => (city.window.east - city.window.west).toFixed(4)),
    )
    expect(spans.size).toBe(1)
  })

  it('states the scales it quantised with', () => {
    expect(manifest?.scales.radiance.codes).toBe(255)
    expect(manifest?.scales.observations.codes).toBe(255)
    expect(manifest?.adequacy.minObservations).toBe(ADEQUATE_MIN_OBSERVATIONS)
  })

  it('records provenance and citations', () => {
    expect(manifest?.citations.length).toBeGreaterThan(0)
    if (manifest?.provenance.kind === 'synthetic') {
      expect(manifest.provenance.caveat).toBeTruthy()
    }
  })
})

describe('size budget', () => {
  it('keeps every city stack inside its budget', () => {
    for (const stack of manifest?.stacks ?? []) {
      expect(stack.bytes).toBeLessThanOrEqual(BUDGET.perCityBytes)
    }
  })

  it('keeps the upfront series payload inside its budget', () => {
    const bytes = statSync(join(OUT_ROOT, 'series', 'all.json')).size
    expect(bytes).toBeLessThanOrEqual(BUDGET.seriesBytes)
  })

  it('keeps the national overview inside its budget', () => {
    const bytes = ['radiance', 'observations']
      .map((band) => statSync(join(OUT_ROOT, `${manifest?.overview.path}.${band}.png`)).size)
      .reduce((a, b) => a + b, 0)
    expect(bytes).toBeLessThanOrEqual(BUDGET.overviewBytes)
  })
})

describe('the change table', () => {
  const years = manifest?.years ?? []
  const from = years[0] ?? 2013
  const to = years[years.length - 1] ?? 2025

  it('carries adequacy for both endpoint periods on every entry', () => {
    for (const entry of buildChangeTable(allSeries, from, to)) {
      expect(['adequate', 'thin', 'missing']).toContain(entry.fromAdequacy)
      expect(['adequate', 'thin', 'missing']).toContain(entry.toAdequacy)
      expect(entry.underpowered).toBe(
        entry.fromAdequacy !== 'adequate' || entry.toAdequacy !== 'adequate',
      )
    }
  })

  it('ranks deterministically', () => {
    const once = buildChangeTable(allSeries, from, to).map((entry) => entry.cityId)
    const twice = buildChangeTable(allSeries, from, to).map((entry) => entry.cityId)
    expect(once).toEqual(twice)
  })
})
