import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'
import { computeFlags } from '@/lib/lights/divergence'
import { cityById } from '@/data/cities'
import { OUT_ROOT } from '@/scripts/config'
import type { CitySeries } from '@/lib/lights/types'

const bundleExists = existsSync(join(OUT_ROOT, 'series', 'all.json'))

beforeAll(() => {
  if (!bundleExists) throw new Error('no bundle under public/data — run `pnpm data:build` first')
})

const allSeries: CitySeries[] = bundleExists
  ? (JSON.parse(readFileSync(join(OUT_ROOT, 'series', 'all.json'), 'utf8')) as CitySeries[])
  : []

describe('shipped flags are reproducible from shipped numbers', () => {
  it('re-derives every flag from the series it travels with', () => {
    for (const series of allSeries) {
      const city = cityById(series.cityId)
      expect(city).toBeDefined()
      if (city === undefined) continue
      const recomputed = computeFlags({ city, months: series.months, years: series.years })
      expect(series.flags.map((flag) => `${flag.month}:${flag.reason}`).sort()).toEqual(
        recomputed.map((flag) => `${flag.month}:${flag.reason}`).sort(),
      )
    }
  })

  it('never flags a month whose coverage was sparse or absent', () => {
    for (const series of allSeries) {
      const byMonth = new Map(series.months.map((record) => [record.month, record]))
      for (const flag of series.flags) {
        const record = byMonth.get(flag.month)
        expect(record?.type).toBe('observed')
        if (record?.type === 'observed') expect(record.adequacy).toBe('adequate')
      }
    }
  })

  it('produces flags somewhere in the bundle, so the path is exercised', () => {
    expect(allSeries.reduce((total, series) => total + series.flags.length, 0)).toBeGreaterThan(0)
  })

  it('puts the strongest fire divergence in a haze year', () => {
    // 2015 and 2019 are the large Indonesian haze events. This is not
    // hand-authored anywhere; it falls out of the monthly-versus-annual
    // comparison, and if it stopped falling out, something upstream broke.
    const fireFlags = allSeries
      .flatMap((series) => series.flags)
      .filter((flag) => flag.reason === 'fire-divergence')
    expect(fireFlags.length).toBeGreaterThan(0)
    const strongest = fireFlags.reduce((best, flag) => (flag.ratio > best.ratio ? flag : best))
    expect(['2015', '2019']).toContain(strongest.month.slice(0, 4))
  })
})
