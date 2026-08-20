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
import type { CellField, OverviewGrid, SourceProvider } from './sources/types'
import { MONTHS, OVERVIEW_GRID, STACK_COLUMNS, YEARS } from './config'

/**
 * The pipeline proper. Separated from the CLI so the determinism guarantee
 * can be tested against the real code path rather than against a
 * reimplementation of it: `tests/integrity/determinism.test.ts` calls
 * `buildCity` twice and compares the PNG bytes.
 *
 * Two ordering decisions here carry weight.
 *
 * First, the series is summarised from the *decoded* bytes, not from the
 * source floats. What the chart reports is therefore exactly what the image
 * shows, quantisation included, rather than a more precise number the picture
 * cannot support.
 *
 * Second, contamination flags are computed at the end from the finished
 * monthly and annual records. Nothing in this file can hand-author one.
 */

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

export interface BuiltCity {
  readonly series: CitySeries
  readonly geometry: AtlasGeometry
  readonly radiancePng: Buffer
  readonly observationsPng: Buffer
}

export async function buildCity(provider: SourceProvider, city: City): Promise<BuiltCity> {
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

  return {
    series,
    geometry,
    radiancePng: encodeGreyscalePng({ width, height, pixels: radianceAtlas }),
    observationsPng: encodeGreyscalePng({ width, height, pixels: observationAtlas }),
  }
}

export interface BuiltOverview {
  readonly radiancePng: Buffer
  readonly observationsPng: Buffer
}

export async function buildOverview(provider: SourceProvider): Promise<BuiltOverview> {
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

  return {
    radiancePng: encodeGreyscalePng({ width, height, pixels: radianceAtlas }),
    observationsPng: encodeGreyscalePng({ width, height, pixels: observationAtlas }),
  }
}


