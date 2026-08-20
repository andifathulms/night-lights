import { access, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { CITIES } from '@/data/cities'
import { ADEQUATE_MIN_OBSERVATIONS } from '@/lib/lights/adequacy'
import { OBSERVATION_SCALE, RADIANCE_SCALE } from '@/lib/lights/quantise'
import type { CitySeries } from '@/lib/lights/types'
import { buildCity, buildOverview } from './pipeline'
import { createEogProvider } from './sources/eog'
import { createSyntheticProvider } from './sources/synthetic'
import type { SourceProvider } from './sources/types'
import { CITATIONS, MONTHS, OUT_ROOT, OVERVIEW_GRID, YEARS } from './config'

/**
 * The CLI around `pipeline.ts`: choose a source, run every city through it,
 * write the bundle. The computation lives in the pipeline module so the
 * determinism test can drive the same code the build does.
 */

async function exists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

/**
 * What `data:fetch` recorded about the files it pulled. The digest covers the
 * checksums of every distributed archive, so a bundle can be traced back to
 * the exact composites behind it rather than to a version string someone
 * typed.
 */
async function readSourceStamp(): Promise<
  { sourceVersion: string; monthlyProduct: string; annualProduct: string } | undefined
> {
  try {
    const raw = await readFile(join(process.cwd(), 'data', 'raw', 'SOURCE.json'), 'utf8')
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const { sourceVersion, monthlyProduct, annualProduct } = parsed
    if (
      typeof sourceVersion === 'string' &&
      typeof monthlyProduct === 'string' &&
      typeof annualProduct === 'string'
    ) {
      return { sourceVersion, monthlyProduct, annualProduct }
    }
    return undefined
  } catch {
    return undefined
  }
}

async function chooseProvider(): Promise<SourceProvider> {
  const requested = process.env.SOURCE
  const stamp = await readSourceStamp()
  const sourceVersion =
    process.env.SOURCE_VERSION ?? stamp?.sourceVersion ?? 'vnl-v1-monthly+v2.1-annual'
  const haveClips = await exists(join(process.cwd(), 'data', 'raw', 'clips'))

  if (requested === 'eog' || (requested === undefined && haveClips)) {
    if (stamp === undefined) {
      throw new Error(
        'EOG clips are present but data/raw/SOURCE.json is missing — rerun `pnpm data:fetch` ' +
          'so the bundle can record which composites it was built from.',
      )
    }
    return createEogProvider(sourceVersion, stamp)
  }
  if (requested !== undefined && requested !== 'synthetic') {
    throw new Error(`unknown SOURCE=${requested}; expected 'eog' or 'synthetic'`)
  }
  console.warn(
    '[data:build] No EOG clips under data/raw/clips — building from the deterministic\n' +
      '             stand-in. The manifest records provenance: synthetic and every page\n' +
      '             says so. Run `pnpm data:fetch` for the real composites.',
  )
  return createSyntheticProvider({ months: MONTHS, cities: CITIES, sourceVersion })
}

async function main(): Promise<void> {
  const provider = await chooseProvider()
  await rm(OUT_ROOT, { recursive: true, force: true })
  await mkdir(OUT_ROOT, { recursive: true })

  const stackDir = join(OUT_ROOT, 'stacks')
  await mkdir(stackDir, { recursive: true })

  const stacks = []
  const allSeries: CitySeries[] = []

  for (const city of CITIES) {
    const built = await buildCity(provider, city)
    allSeries.push(built.series)
    await writeFile(join(stackDir, `${city.id}.radiance.png`), built.radiancePng)
    await writeFile(join(stackDir, `${city.id}.observations.png`), built.observationsPng)
    const bytes = built.radiancePng.length + built.observationsPng.length
    stacks.push({
      cityId: city.id,
      months: [...MONTHS],
      geometry: built.geometry,
      radiancePath: `stacks/${city.id}.radiance.png`,
      observationsPath: `stacks/${city.id}.observations.png`,
      bytes,
    })
    process.stdout.write(`  ${city.id.padEnd(16)} ${(bytes / 1024).toFixed(0)} kB\n`)
  }

  const overview = await buildOverview(provider)
  const overviewDir = join(OUT_ROOT, 'overview')
  await mkdir(overviewDir, { recursive: true })
  await writeFile(join(overviewDir, 'national.radiance.png'), overview.radiancePng)
  await writeFile(join(overviewDir, 'national.observations.png'), overview.observationsPng)

  const seriesDir = join(OUT_ROOT, 'series')
  await mkdir(seriesDir, { recursive: true })
  for (const series of allSeries) {
    await writeFile(join(seriesDir, `${series.cityId}.json`), `${JSON.stringify(series)}\n`)
  }
  // Series for every city load upfront so browsing and comparison are instant;
  // only imagery is lazy. PRD.md §3.
  await writeFile(join(seriesDir, 'all.json'), `${JSON.stringify(allSeries)}\n`)

  const manifest = {
    version: 1,
    provenance: {
      kind: provider.kind,
      monthlyProduct: provider.monthlyProduct,
      annualProduct: provider.annualProduct,
      ...(provider.caveat === undefined ? {} : { caveat: provider.caveat }),
    },
    generatedFromSourceVersion: provider.sourceVersion,
    months: [...MONTHS],
    years: [...YEARS],
    cities: CITIES,
    stacks,
    overview: {
      years: [...YEARS],
      width: OVERVIEW_GRID.width,
      height: OVERVIEW_GRID.height,
      bounds: {
        west: OVERVIEW_GRID.west,
        south: OVERVIEW_GRID.south,
        east: OVERVIEW_GRID.east,
        north: OVERVIEW_GRID.north,
      },
      path: 'overview/national',
    },
    scales: { radiance: RADIANCE_SCALE, observations: OBSERVATION_SCALE },
    adequacy: { minObservations: ADEQUATE_MIN_OBSERVATIONS },
    citations: CITATIONS,
  }

  await writeFile(join(OUT_ROOT, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)
  process.stdout.write(`\n[data:build] ${CITIES.length} cities, ${MONTHS.length} months → ${OUT_ROOT}\n`)
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
