import { access, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { CITIES } from '@/data/cities'
import { ADEQUATE_MIN_OBSERVATIONS } from '@/lib/lights/adequacy'
import { computeFlags } from '@/lib/lights/divergence'
import { atlasSize, decodeFrame, tileOrigin, type AtlasGeometry } from '@/lib/lights/decode'
import { LIT_THRESHOLD_RADIANCE, summariseFrame } from '@/lib/lights/series'
import {
  OBSERVATION_SCALE,
  RADIANCE_SCALE,
  encodeObservations,
  encodeRadiance,
} from '@/lib/lights/quantise'
import type { AnnualRecord, City, CitySeries } from '@/lib/lights/types'
import { encodeGreyscalePng } from './png'
import { createEogProvider } from './sources/eog'
import { createSyntheticProvider } from './sources/synthetic'
import type { CellField, OverviewGrid, SourceProvider } from './sources/types'
import { CITATIONS, MONTHS, OVERVIEW_GRID, OUT_ROOT, STACK_COLUMNS, YEARS } from './config'

/**
 * The pipeline: composites in, quantised PNG stacks and JSON series out.
 *
 * Two things about the order of operations here matter.
 *
 * First, the series is summarised from the *decoded* bytes, not from the
 * source floats. What the chart reports is therefore exactly what the image
 * shows, quantisation included, rather than a more precise number the picture
 * cannot support.
 *
 * Second, contamination flags are computed at the end from the finished
 * monthly and annual records. Nothing in this file can hand-author one.
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

/** Pack a field into the two byte planes, reserving 0 for "not seen". */
function packField(field: CellField): { radiance: Uint8Array; observations: Uint8Array } {
  const cells = field.radiance.length
  const radiance = new Uint8Array(cells)
  const observations = new Uint8Array(cells)
  for (let i = 0; i < cells; i += 1) {
    const seen = field.observations[i] as number
    if (seen === 0) {
      // Both planes stay at 0. A cell the sensor never saw has no radiance to
      // record, and writing one would be the exact conflation this project
      // exists to prevent. CLAUDE.md invariant 2.
      continue
    }
    observations[i] = encodeObservations(seen, OBSERVATION_SCALE)
    radiance[i] = encodeRadiance(field.radiance[i] as number, RADIANCE_SCALE)
  }
  return { radiance, observations }
}

function blitTile(
  atlas: Uint8Array,
  atlasWidth: number,
  geometry: AtlasGeometry,
  tileIndex: number,
  tile: Uint8Array,
): void {
  const origin = tileOrigin(geometry, tileIndex)
  for (let y = 0; y < geometry.tileHeight; y += 1) {
    for (let x = 0; x < geometry.tileWidth; x += 1) {
      atlas[(origin.y + y) * atlasWidth + (origin.x + x)] = tile[
        y * geometry.tileWidth + x
      ] as number
    }
  }
}

/** Annual record, summarised from the decoded bytes for the same reason as months. */
function summariseAnnual(year: number, field: CellField, city: City): AnnualRecord {
  const packed = packField(field)
  const geometry: AtlasGeometry = {
    tileWidth: city.window.widthPx,
    tileHeight: city.window.heightPx,
    columns: 1,
    tiles: 1,
  }
  const frame = decodeFrame({
    radianceRgba: toRgba(packed.radiance),
    observationsRgba: toRgba(packed.observations),
    geometry,
    tileIndex: 0,
  })

  let sum = 0
  let lit = 0
  let observed = 0
  let observations = 0
  for (let i = 0; i < frame.radiance.length; i += 1) {
    if (frame.state[i] !== 'observed') continue
    observed += 1
    sum += frame.radiance[i] as number
    observations += frame.observations[i] as number
    if ((frame.radiance[i] as number) >= LIT_THRESHOLD_RADIANCE) lit += 1
  }

  return {
    year,
    meanRadiance: observed === 0 ? 0 : round(sum / observed, 4),
    litRatio: observed === 0 ? 0 : round(lit / observed, 5),
    observations,
  }
}

/** The decoder reads RGBA because that is what a canvas hands it. */
function toRgba(plane: Uint8Array): Uint8Array {
  const rgba = new Uint8Array(plane.length * 4)
  for (let i = 0; i < plane.length; i += 1) {
    const value = plane[i] as number
    rgba[i * 4] = value
    rgba[i * 4 + 1] = value
    rgba[i * 4 + 2] = value
    rgba[i * 4 + 3] = 255
  }
  return rgba
}

function round(value: number, places: number): number {
  const factor = 10 ** places
  return Math.round(value * factor) / factor
}

async function buildCity(
  provider: SourceProvider,
  city: City,
): Promise<{ series: CitySeries; bytes: number; geometry: AtlasGeometry }> {
  const geometry: AtlasGeometry = {
    tileWidth: city.window.widthPx,
    tileHeight: city.window.heightPx,
    columns: STACK_COLUMNS,
    tiles: MONTHS.length,
  }
  const { width, height } = atlasSize(geometry)
  const radianceAtlas = new Uint8Array(width * height)
  const observationAtlas = new Uint8Array(width * height)

  const months = []
  for (const [index, month] of MONTHS.entries()) {
    const field = await provider.monthly(city, month)
    if (field.radiance.length !== city.window.widthPx * city.window.heightPx) {
      throw new Error(`${city.id} ${month}: field does not match the declared window`)
    }
    const packed = packField(field)
    blitTile(radianceAtlas, width, geometry, index, packed.radiance)
    blitTile(observationAtlas, width, geometry, index, packed.observations)

    const frame = decodeFrame({
      radianceRgba: toRgba(packed.radiance),
      observationsRgba: toRgba(packed.observations),
      geometry: { ...geometry, columns: 1, tiles: 1 },
      tileIndex: 0,
    })
    const record = summariseFrame(month, frame)
    months.push(
      record.type === 'observed'
        ? {
            ...record,
            meanRadiance: round(record.meanRadiance, 4),
            litRatio: round(record.litRatio, 5),
          }
        : record,
    )
  }

  const years: AnnualRecord[] = []
  for (const year of YEARS) {
    years.push(summariseAnnual(year, await provider.annual(city, year), city))
  }

  const series: CitySeries = {
    cityId: city.id,
    months,
    years,
    flags: computeFlags({ city, months, years }),
  }

  const stackDir = join(OUT_ROOT, 'stacks')
  await mkdir(stackDir, { recursive: true })
  const radiancePng = encodeGreyscalePng({ width, height, pixels: radianceAtlas })
  const observationPng = encodeGreyscalePng({ width, height, pixels: observationAtlas })
  await writeFile(join(stackDir, `${city.id}.radiance.png`), radiancePng)
  await writeFile(join(stackDir, `${city.id}.observations.png`), observationPng)

  return { series, bytes: radiancePng.length + observationPng.length, geometry }
}

async function buildOverview(provider: SourceProvider): Promise<void> {
  const grid: OverviewGrid = OVERVIEW_GRID
  const geometry: AtlasGeometry = {
    tileWidth: grid.width,
    tileHeight: grid.height,
    columns: 1,
    tiles: YEARS.length,
  }
  const { width, height } = atlasSize(geometry)
  const radianceAtlas = new Uint8Array(width * height)
  const observationAtlas = new Uint8Array(width * height)

  for (const [index, year] of YEARS.entries()) {
    const packed = packField(await provider.overview(year, grid))
    blitTile(radianceAtlas, width, geometry, index, packed.radiance)
    blitTile(observationAtlas, width, geometry, index, packed.observations)
  }

  const dir = join(OUT_ROOT, 'overview')
  await mkdir(dir, { recursive: true })
  await writeFile(
    join(dir, 'national.radiance.png'),
    encodeGreyscalePng({ width, height, pixels: radianceAtlas }),
  )
  await writeFile(
    join(dir, 'national.observations.png'),
    encodeGreyscalePng({ width, height, pixels: observationAtlas }),
  )
}

async function main(): Promise<void> {
  const provider = await chooseProvider()
  await rm(OUT_ROOT, { recursive: true, force: true })
  await mkdir(OUT_ROOT, { recursive: true })

  const stacks = []
  const allSeries: CitySeries[] = []

  for (const city of CITIES) {
    const built = await buildCity(provider, city)
    allSeries.push(built.series)
    stacks.push({
      cityId: city.id,
      months: [...MONTHS],
      geometry: built.geometry,
      radiancePath: `stacks/${city.id}.radiance.png`,
      observationsPath: `stacks/${city.id}.observations.png`,
      bytes: built.bytes,
    })
    process.stdout.write(`  ${city.id.padEnd(16)} ${(built.bytes / 1024).toFixed(0)} kB\n`)
  }

  await buildOverview(provider)

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
