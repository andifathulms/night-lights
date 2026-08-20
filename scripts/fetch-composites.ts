import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import { createWriteStream } from 'node:fs'
import { mkdir, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { Readable } from 'node:stream'
import { pipeline as streamPipeline } from 'node:stream/promises'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { CITIES } from '@/data/cities'
import { MONTHS, OVERVIEW_GRID, YEARS } from './config'
import {
  annualDirectory,
  bandOf,
  listDirectory,
  monthlyDirectory,
  requestToken,
  tilesCovering,
} from './eog'

/**
 * DEV/CI only. Pulls the EOG composites and cuts the city windows out of
 * them, leaving the flat clips that `scripts/sources/eog.ts` reads.
 *
 * This is a large download, not a clever one. EOG distributes monthly
 * composites as per-tile `.tgz` archives and annual composites as gzipped
 * GeoTIFFs — neither can be range-read — so covering Indonesia means pulling
 * two global tiles per month for fourteen years. `--dry-run` prints the plan
 * and the estimate before any of that happens, and is the right first
 * command to run.
 *
 * Requires: an EOG account in EOG_USERNAME / EOG_PASSWORD, GDAL on the path,
 * and a few hundred gigabytes of scratch. Raw downloads are never committed.
 */

const run = promisify(execFile)

const RAW_ROOT = join(process.cwd(), 'data', 'raw')
const ARCHIVE_ROOT = join(RAW_ROOT, 'archives')
const TIF_ROOT = join(RAW_ROOT, 'tif')

/** Rough per-tile archive size, for the estimate only. Real sizes vary by month. */
const MONTHLY_TILE_BYTES = 900 * 1024 * 1024
const ANNUAL_FILE_BYTES = 5 * 1024 * 1024 * 1024

interface Options {
  readonly dryRun: boolean
  readonly months: readonly string[]
  readonly years: readonly number[]
  readonly keepArchives: boolean
}

function parseOptions(argv: readonly string[]): Options {
  const value = (flag: string): string | undefined =>
    argv.find((argument) => argument.startsWith(`${flag}=`))?.split('=')[1]

  const months = value('--months')
  const years = value('--years')
  return {
    dryRun: argv.includes('--dry-run'),
    months: months === undefined ? MONTHS : months.split(','),
    years:
      years === undefined ? YEARS : years.split(',').map((year) => Number.parseInt(year, 10)),
    keepArchives: argv.includes('--keep-archives'),
  }
}

/** Every window the clips have to cover: each city, plus the national grid. */
function coverageBounds(): { west: number; south: number; east: number; north: number } {
  return {
    west: Math.min(OVERVIEW_GRID.west, ...CITIES.map((city) => city.window.west)),
    south: Math.min(OVERVIEW_GRID.south, ...CITIES.map((city) => city.window.south)),
    east: Math.max(OVERVIEW_GRID.east, ...CITIES.map((city) => city.window.east)),
    north: Math.max(OVERVIEW_GRID.north, ...CITIES.map((city) => city.window.north)),
  }
}

async function requireGdal(): Promise<void> {
  for (const tool of ['gdal_translate', 'gdalbuildvrt']) {
    try {
      await run(tool, ['--version'])
    } catch (cause) {
      throw new Error(`${tool} not found. Install GDAL (brew install gdal) before data:fetch.`, {
        cause,
      })
    }
  }
}

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

async function download(url: string, target: string, token: string): Promise<void> {
  // Resumable in the coarse sense that matters here: an interrupted run is
  // restarted and skips whatever already landed.
  if (await exists(target)) return
  const response = await fetch(url, { headers: { authorization: `Bearer ${token}` } })
  if (!response.ok) throw new Error(`download ${url} failed: ${response.status}`)
  if (response.body === null) throw new Error(`download ${url} returned no body`)
  const partial = `${target}.partial`
  // Streamed rather than buffered: an annual composite does not fit in memory.
  // The cast bridges the DOM ReadableStream in lib.dom and the node:stream/web
  // one Readable.fromWeb is typed against; they are the same object at runtime.
  const stream = response.body as unknown as Parameters<typeof Readable.fromWeb>[0]
  await streamPipeline(Readable.fromWeb(stream), createWriteStream(partial))
  await run('mv', [partial, target])
}

async function sha256(path: string): Promise<string> {
  const { stdout } = await run('shasum', ['-a', '256', path])
  return (stdout.split(' ')[0] ?? '').trim()
}

/** Mosaic the tiles for one band and month, then cut every window out of it. */
async function clipAll(input: {
  sources: readonly string[]
  band: 'radiance' | 'observations'
  stem: string
}): Promise<void> {
  const type = input.band === 'radiance' ? 'Float32' : 'Byte'
  const suffix = input.band === 'radiance' ? 'rad.f32' : 'obs.u8'

  const vrt = join(TIF_ROOT, `${input.stem}.${input.band}.vrt`)
  await run('gdalbuildvrt', ['-q', '-overwrite', vrt, ...input.sources])

  for (const city of CITIES) {
    const dir = join(RAW_ROOT, 'clips', city.id)
    await mkdir(dir, { recursive: true })
    const target = join(dir, `${input.stem}.${suffix}`)
    if (await exists(target)) continue
    await run('gdal_translate', [
      '-q',
      '-projwin', String(city.window.west), String(city.window.north),
      String(city.window.east), String(city.window.south),
      '-outsize', String(city.window.widthPx), String(city.window.heightPx),
      '-ot', type,
      '-of', 'ENVI',
      vrt,
      target,
    ])
  }

  // The national browse grid comes from the annual composites only.
  if (input.stem.endsWith('.annual')) {
    const year = input.stem.slice(0, 4)
    await mkdir(join(RAW_ROOT, 'overview'), { recursive: true })
    const target = join(RAW_ROOT, 'overview', `${year}.${suffix}`)
    if (!(await exists(target))) {
      await run('gdal_translate', [
        '-q',
        '-projwin', String(OVERVIEW_GRID.west), String(OVERVIEW_GRID.north),
        String(OVERVIEW_GRID.east), String(OVERVIEW_GRID.south),
        '-outsize', String(OVERVIEW_GRID.width), String(OVERVIEW_GRID.height),
        '-r', 'average',
        '-ot', type,
        '-of', 'ENVI',
        vrt,
        target,
      ])
    }
  }
}

async function fetchMonth(month: string, token: string, options: Options, tiles: readonly string[]): Promise<Record<string, string>> {
  const directory = monthlyDirectory(month)
  const entries = await listDirectory(directory, token)
  const checksums: Record<string, string> = {}
  const extracted: { radiance: string[]; observations: string[] } = { radiance: [], observations: [] }

  for (const tile of tiles) {
    const archive = entries.find((entry) => entry.includes(tile) && entry.endsWith('.tgz'))
    if (archive === undefined) {
      throw new Error(`no ${tile} archive listed for ${month} in ${directory}`)
    }
    const archivePath = join(ARCHIVE_ROOT, archive)
    await download(`${directory}${archive}`, archivePath, token)
    checksums[archive] = await sha256(archivePath)

    const target = join(TIF_ROOT, month, tile)
    await mkdir(target, { recursive: true })
    // Only the two bands we use; the archives also carry masks we do not.
    await run('tar', ['-xzf', archivePath, '-C', target, '--wildcards', '*avg_rade9h.tif', '*cf_cvg.tif'])
    for (const file of await readdir(target)) {
      const band = bandOf(file)
      if (band !== undefined) extracted[band].push(join(target, file))
    }
    if (!options.keepArchives) await rm(archivePath, { force: true })
  }

  for (const band of ['radiance', 'observations'] as const) {
    if (extracted[band].length === 0) throw new Error(`${month}: no ${band} band extracted`)
    await clipAll({ sources: extracted[band], band, stem: month })
  }
  await rm(join(TIF_ROOT, month), { recursive: true, force: true })
  return checksums
}

async function fetchYear(year: number, token: string): Promise<Record<string, string>> {
  const directory = annualDirectory(year)
  const entries = await listDirectory(directory, token)
  const checksums: Record<string, string> = {}

  for (const band of ['radiance', 'observations'] as const) {
    const file = entries.find((entry) => entry.endsWith('.tif.gz') && bandOf(entry) === band)
    if (file === undefined) throw new Error(`no annual ${band} file listed for ${year}`)
    const archivePath = join(ARCHIVE_ROOT, file)
    await download(`${directory}${file}`, archivePath, token)
    checksums[file] = await sha256(archivePath)

    await mkdir(join(TIF_ROOT, String(year)), { recursive: true })
    const tif = join(TIF_ROOT, String(year), file.replace(/\.gz$/, ''))
    if (!(await exists(tif))) await run('sh', ['-c', `gunzip -c ${archivePath} > ${tif}`])
    await clipAll({ sources: [tif], band, stem: `${year}.annual` })
    await rm(tif, { force: true })
  }
  await rm(join(TIF_ROOT, String(year)), { recursive: true, force: true })
  return checksums
}

function formatBytes(bytes: number): string {
  return `${(bytes / 1024 ** 3).toFixed(0)} GB`
}

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2))
  const tiles = tilesCovering(coverageBounds())

  const estimate =
    options.months.length * tiles.length * MONTHLY_TILE_BYTES +
    options.years.length * 2 * ANNUAL_FILE_BYTES

  process.stdout.write(
    `[data:fetch] ${options.months.length} months x ${tiles.length} tiles (${tiles.join(', ')})\n` +
      `             ${options.years.length} annual composites\n` +
      `             ${CITIES.length} city windows plus the national browse grid\n` +
      `             roughly ${formatBytes(estimate)} to transfer\n`,
  )

  if (options.dryRun) {
    process.stdout.write('[data:fetch] dry run — nothing downloaded\n')
    return
  }

  await requireGdal()
  const token = await requestToken()
  await mkdir(ARCHIVE_ROOT, { recursive: true })
  await mkdir(TIF_ROOT, { recursive: true })

  const checksums: Record<string, string> = {}

  for (const month of options.months) {
    Object.assign(checksums, await fetchMonth(month, token, options, tiles))
    process.stdout.write(`  ${month}\n`)
  }
  for (const year of options.years) {
    Object.assign(checksums, await fetchYear(year, token))
    process.stdout.write(`  ${year} annual\n`)
  }

  // The build stamps this into the manifest, so a bundle can be traced back
  // to the exact distributed files it came from.
  const sourceVersion = createHash('sha256')
    .update(Object.keys(checksums).sort().map((name) => `${name}:${checksums[name]}`).join('\n'))
    .digest('hex')
    .slice(0, 16)

  await writeFile(
    join(RAW_ROOT, 'SOURCE.json'),
    `${JSON.stringify(
      {
        producer:
          'Earth Observation Group, Payne Institute for Public Policy, Colorado School of Mines',
        monthlyProduct: 'VIIRS DNB VNL v1 monthly cloud-free composite, vcmcfg (unfiltered)',
        annualProduct: 'VIIRS DNB VNL v2.1 annual composite (temporal lights removed)',
        sourceVersion,
        files: checksums,
      },
      null,
      2,
    )}\n`,
  )

  await rm(TIF_ROOT, { recursive: true, force: true })
  process.stdout.write(`\n[data:fetch] clips written to data/raw — now run \`pnpm data:build\`\n`)
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
