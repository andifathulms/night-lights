import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { City } from '@/lib/lights/types'
import type { CellField, OverviewGrid, SourceProvider } from './types'

/**
 * Reads clips of the real EOG composites.
 *
 * `pnpm data:fetch` is responsible for downloading the published composites
 * and cutting each city window out of them with GDAL, leaving a pair of flat
 * binaries per city-month under `data/raw/clips/`:
 *
 *   <city>/<YYYY-MM>.rad.f32   little-endian float32, nW/cm²/sr, row-major
 *   <city>/<YYYY-MM>.obs.u8    uint8 cloud-free observation count
 *   <city>/<YYYY>.annual.rad.f32 / .obs.u8
 *
 * Raw composites are never committed (CLAUDE.md invariant 9); `data/raw/` is
 * ignored and this provider fails loudly when it is empty rather than
 * silently substituting anything.
 */

const RAW_ROOT = join(process.cwd(), 'data', 'raw', 'clips')

// VNL v1 is the monthly series; only the annual series carries the filtering
// that removes aurora, fires, boats and background. Elvidge et al. 2017, 2021.
const MONTHLY_PRODUCT = 'VIIRS DNB VNL v1 monthly cloud-free composite (unfiltered)'
const ANNUAL_PRODUCT = 'VIIRS DNB VNL v2.1 annual composite (temporal lights removed)'

async function readPair(city: City, stem: string): Promise<CellField> {
  const cells = city.window.widthPx * city.window.heightPx
  const dir = join(RAW_ROOT, city.id)
  let radianceBytes: Buffer
  let observationBytes: Buffer
  try {
    radianceBytes = await readFile(join(dir, `${stem}.rad.f32`))
    observationBytes = await readFile(join(dir, `${stem}.obs.u8`))
  } catch (cause) {
    throw new Error(
      `no EOG clip for ${city.id} ${stem}. Run \`pnpm data:fetch\` first, or build ` +
        `with SOURCE=synthetic for a stand-in bundle.`,
      { cause },
    )
  }
  if (radianceBytes.length !== cells * 4) {
    throw new Error(`${city.id} ${stem}: radiance clip is ${radianceBytes.length} bytes, expected ${cells * 4}`)
  }
  if (observationBytes.length !== cells) {
    throw new Error(`${city.id} ${stem}: observation clip is ${observationBytes.length} bytes, expected ${cells}`)
  }
  return {
    radiance: new Float32Array(
      radianceBytes.buffer.slice(
        radianceBytes.byteOffset,
        radianceBytes.byteOffset + radianceBytes.length,
      ),
    ),
    observations: new Uint8Array(observationBytes),
  }
}

async function readOverview(year: number, grid: OverviewGrid): Promise<CellField> {
  const cells = grid.width * grid.height
  const dir = join(process.cwd(), 'data', 'raw', 'overview')
  let radianceBytes: Buffer
  let observationBytes: Buffer
  try {
    radianceBytes = await readFile(join(dir, `${year}.rad.f32`))
    observationBytes = await readFile(join(dir, `${year}.obs.u8`))
  } catch (cause) {
    throw new Error(`no downsampled national annual composite for ${year}. Run \`pnpm data:fetch\`.`, {
      cause,
    })
  }
  if (radianceBytes.length !== cells * 4 || observationBytes.length !== cells) {
    throw new Error(`national ${year}: clip does not match the ${grid.width}x${grid.height} browse grid`)
  }
  return {
    radiance: new Float32Array(
      radianceBytes.buffer.slice(
        radianceBytes.byteOffset,
        radianceBytes.byteOffset + radianceBytes.length,
      ),
    ),
    observations: new Uint8Array(observationBytes),
  }
}

export function createEogProvider(sourceVersion: string): SourceProvider {
  return {
    kind: 'eog',
    monthlyProduct: MONTHLY_PRODUCT,
    annualProduct: ANNUAL_PRODUCT,
    sourceVersion,
    monthly: (city, month) => readPair(city, month),
    annual: (city, year) => readPair(city, `${year}.annual`),
    overview: (year, grid) => readOverview(year, grid),
  }
}
