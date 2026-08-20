import { readFile, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { citySeriesSchema, manifestSchema } from '@/lib/data/schema'
import { computeFlags } from '@/lib/lights/divergence'
import { cityById } from '@/data/cities'
import { BUDGET, OUT_ROOT } from './config'

/**
 * The build gate. `pnpm build` runs this first, and CI runs it before the
 * deploy, so nothing that fails here can reach a page.
 *
 * It checks four things the site's honesty depends on: that every record
 * carries an observation count, that no-data is never rendered as a zero
 * value, that flags match what the divergence rule produces from the shipped
 * numbers, and that the chunks stay inside their budget.
 */

const failures: string[] = []

function fail(message: string): void {
  failures.push(message)
}

async function main(): Promise<void> {
  const manifestRaw = await readFile(join(OUT_ROOT, 'manifest.json'), 'utf8').catch(() => {
    throw new Error(`no bundle at ${OUT_ROOT}. Run \`pnpm data:build\` first.`)
  })
  const manifest = manifestSchema.parse(JSON.parse(manifestRaw))

  if (manifest.provenance.kind === 'synthetic' && manifest.provenance.caveat === undefined) {
    fail('synthetic provenance must carry a caveat — a stand-in bundle has to say so')
  }
  if (manifest.citations.length === 0) {
    fail('manifest carries no citations; attribution is structural')
  }

  const allRaw = await readFile(join(OUT_ROOT, 'series', 'all.json'), 'utf8')
  const all = JSON.parse(allRaw) as unknown[]
  if (all.length !== manifest.cities.length) {
    fail(`series/all.json has ${all.length} cities, manifest declares ${manifest.cities.length}`)
  }

  for (const raw of all) {
    const parsed = citySeriesSchema.safeParse(raw)
    if (!parsed.success) {
      fail(`series failed schema: ${parsed.error.issues.map((i) => i.path.join('.') + ' ' + i.message).join('; ')}`)
      continue
    }
    const series = parsed.data
    const city = cityById(series.cityId)
    if (city === undefined) {
      fail(`series for unknown city ${series.cityId}`)
      continue
    }

    if (series.months.length !== manifest.months.length) {
      fail(`${series.cityId}: ${series.months.length} months, manifest declares ${manifest.months.length}`)
    }

    for (const record of series.months) {
      // The schema already makes this unrepresentable; assert it anyway,
      // because this is the one invariant the project cannot afford to lose
      // to a refactor. PRD.md §9.
      if (record.type === 'observed' && !(record.observations > 0)) {
        fail(`${series.cityId} ${record.month}: radiance without a positive observation count`)
      }
      if (record.type === 'no-data' && 'meanRadiance' in record) {
        fail(`${series.cityId} ${record.month}: a no-data month carries a radiance value`)
      }
      if (record.type === 'observed') {
        const expected = record.observations >= manifest.adequacy.minObservations ? 'adequate' : 'sparse'
        if (record.adequacy !== expected) {
          fail(`${series.cityId} ${record.month}: adequacy ${record.adequacy}, expected ${expected}`)
        }
      }
    }

    // Flags must be reproducible from the shipped numbers. A flag list that
    // cannot be re-derived has drifted from its data. CLAUDE.md invariant 5.
    const recomputed = computeFlags({ city, months: series.months, years: series.years })
    const shipped = series.flags.map((flag) => `${flag.month}:${flag.reason}`).sort()
    const expected = recomputed.map((flag) => `${flag.month}:${flag.reason}`).sort()
    if (shipped.join(',') !== expected.join(',')) {
      fail(`${series.cityId}: flags do not match the divergence rule applied to the shipped series`)
    }

    const stack = manifest.stacks.find((entry) => entry.cityId === series.cityId)
    if (stack === undefined) {
      fail(`${series.cityId}: no stack entry in the manifest`)
      continue
    }
    for (const path of [stack.radiancePath, stack.observationsPath]) {
      const info = await stat(join(OUT_ROOT, path)).catch(() => undefined)
      if (info === undefined) {
        fail(`${series.cityId}: missing ${path}`)
        continue
      }
      if (info.size === 0) fail(`${series.cityId}: ${path} is empty`)
    }
    if (stack.bytes > BUDGET.perCityBytes) {
      fail(`${series.cityId}: stack is ${(stack.bytes / 1024).toFixed(0)} kB, budget ${(BUDGET.perCityBytes / 1024).toFixed(0)} kB`)
    }
    if (stack.geometry.tileWidth !== city.window.widthPx || stack.geometry.tileHeight !== city.window.heightPx) {
      fail(`${series.cityId}: stack tile geometry does not match the declared window`)
    }
  }

  const overviewBytes = (
    await Promise.all(
      ['radiance', 'observations'].map(async (band) => {
        const info = await stat(join(OUT_ROOT, `${manifest.overview.path}.${band}.png`)).catch(() => undefined)
        if (info === undefined) {
          fail(`missing national overview ${band} plane`)
          return 0
        }
        return info.size
      }),
    )
  ).reduce((a, b) => a + b, 0)
  if (overviewBytes > BUDGET.overviewBytes) {
    fail(`national overview is ${(overviewBytes / 1024).toFixed(0)} kB, budget ${(BUDGET.overviewBytes / 1024).toFixed(0)} kB`)
  }

  const seriesBytes = (await stat(join(OUT_ROOT, 'series', 'all.json'))).size
  if (seriesBytes > BUDGET.seriesBytes) {
    fail(`series/all.json is ${(seriesBytes / 1024).toFixed(0)} kB and loads upfront; budget ${(BUDGET.seriesBytes / 1024).toFixed(0)} kB`)
  }

  if (failures.length > 0) {
    console.error(`\n[data:validate] ${failures.length} failure(s):`)
    for (const failure of failures) console.error(`  - ${failure}`)
    process.exit(1)
  }

  process.stdout.write(
    `[data:validate] ok — ${manifest.cities.length} cities, ${manifest.months.length} months, ` +
      `provenance ${manifest.provenance.kind}, series ${(seriesBytes / 1024).toFixed(0)} kB upfront\n`,
  )
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
