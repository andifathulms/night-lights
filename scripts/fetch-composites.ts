import { mkdir, writeFile } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { join } from 'node:path'
import { CITIES } from '@/data/cities'
import { MONTHS, OVERVIEW_GRID, YEARS } from './config'

/**
 * DEV/CI only. Downloads the published EOG composites and cuts the city
 * windows out of them, leaving the flat clips that `scripts/sources/eog.ts`
 * reads.
 *
 * This is not part of the deployed site and never runs in the browser. It
 * needs network access and GDAL on the path; the composites are large and
 * are never committed (CLAUDE.md invariant 9).
 *
 * Monthly composites are VNL v1 — unfiltered, containing aurora, fires, lit
 * boats and other temporal lights. Annual composites are VNL v2.1, with
 * temporal lights and background removed. The site depends on that
 * difference, so the two are fetched from their own product trees rather
 * than being derived from one another.
 */

const run = promisify(execFile)

const EOG_ROOT = process.env.EOG_ROOT ?? 'https://eogdata.mines.edu/nighttime_light'
const RAW_ROOT = join(process.cwd(), 'data', 'raw')

interface Band {
  /** Remote composite, as a GDAL-readable path (`/vsicurl/...` works here). */
  readonly source: string
  /** `avg_rade9h` for radiance, `cf_cvg` for the cloud-free observation count. */
  readonly band: 'radiance' | 'observations'
}

function monthlyBands(month: string): Band[] {
  const [year, mm] = [month.slice(0, 4), month.slice(5, 7)]
  const base = `/vsicurl/${EOG_ROOT}/monthly/v10/${year}/${year}${mm}/vcmcfg`
  return [
    { source: `${base}/avg_rade9h.tif`, band: 'radiance' },
    { source: `${base}/cf_cvg.tif`, band: 'observations' },
  ]
}

function annualBands(year: number): Band[] {
  const base = `/vsicurl/${EOG_ROOT}/annual/v21/${year}`
  return [
    { source: `${base}/average_masked.tif`, band: 'radiance' },
    { source: `${base}/cf_cvg.tif`, band: 'observations' },
  ]
}

async function requireGdal(): Promise<void> {
  try {
    await run('gdal_translate', ['--version'])
  } catch (cause) {
    throw new Error(
      'gdal_translate not found. Install GDAL (brew install gdal) before running data:fetch.',
      { cause },
    )
  }
}

/** Cut one window out of one composite and write it as a flat binary. */
async function clip(input: {
  source: string
  bounds: { west: number; north: number; east: number; south: number }
  width: number
  height: number
  type: 'Float32' | 'Byte'
  target: string
}): Promise<void> {
  const { west, north, east, south } = input.bounds
  await run('gdal_translate', [
    '-q',
    '-projwin', String(west), String(north), String(east), String(south),
    '-outsize', String(input.width), String(input.height),
    '-ot', input.type,
    '-of', 'ENVI',
    input.source,
    input.target,
  ])
}

async function main(): Promise<void> {
  await requireGdal()
  await mkdir(join(RAW_ROOT, 'clips'), { recursive: true })
  await mkdir(join(RAW_ROOT, 'overview'), { recursive: true })

  for (const city of CITIES) {
    const dir = join(RAW_ROOT, 'clips', city.id)
    await mkdir(dir, { recursive: true })
    for (const month of MONTHS) {
      for (const { source, band } of monthlyBands(month)) {
        await clip({
          source,
          bounds: city.window,
          width: city.window.widthPx,
          height: city.window.heightPx,
          type: band === 'radiance' ? 'Float32' : 'Byte',
          target: join(dir, `${month}.${band === 'radiance' ? 'rad.f32' : 'obs.u8'}`),
        })
      }
    }
    for (const year of YEARS) {
      for (const { source, band } of annualBands(year)) {
        await clip({
          source,
          bounds: city.window,
          width: city.window.widthPx,
          height: city.window.heightPx,
          type: band === 'radiance' ? 'Float32' : 'Byte',
          target: join(dir, `${year}.annual.${band === 'radiance' ? 'rad.f32' : 'obs.u8'}`),
        })
      }
    }
    process.stdout.write(`  ${city.id}\n`)
  }

  for (const year of YEARS) {
    for (const { source, band } of annualBands(year)) {
      await clip({
        source,
        bounds: OVERVIEW_GRID,
        width: OVERVIEW_GRID.width,
        height: OVERVIEW_GRID.height,
        type: band === 'radiance' ? 'Float32' : 'Byte',
        target: join(RAW_ROOT, 'overview', `${year}.${band === 'radiance' ? 'rad.f32' : 'obs.u8'}`),
      })
    }
  }

  await writeFile(
    join(RAW_ROOT, 'SOURCE.txt'),
    `Earth Observation Group, Payne Institute for Public Policy, Colorado School of Mines.\n` +
      `Monthly: VNL v1 (unfiltered). Annual: VNL v2.1 (temporal lights removed).\n` +
      `Root: ${EOG_ROOT}\n`,
  )
  process.stdout.write('\n[data:fetch] clips written to data/raw — now run `pnpm data:build`\n')
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
