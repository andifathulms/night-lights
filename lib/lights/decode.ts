import {
  NO_DATA_CODE,
  OBSERVATION_SCALE,
  RADIANCE_SCALE,
  decodeObservations,
  decodeRadiance,
  type ObservationScale,
  type RadianceScale,
} from './quantise'

/**
 * Decoding the packed city stacks. Pure: it takes bytes and returns numbers,
 * so the same code path runs in a worker, in the browser, and in a test.
 *
 * A stack ships as two greyscale atlases — radiance and cloud-free
 * observations — with identical tile geometry. They are decoded together and
 * returned together; there is no function here that hands back radiance on
 * its own. CLAUDE.md invariant 1.
 */

export interface AtlasGeometry {
  readonly tileWidth: number
  readonly tileHeight: number
  readonly columns: number
  readonly tiles: number
}

/** Per-pixel classification. `no-data` is a state, not a low value. */
export type PixelState = 'no-data' | 'observed'

export interface DecodedFrame {
  readonly width: number
  readonly height: number
  /** Radiance per pixel, nW/cm²/sr. Entries where state is `no-data` are NaN. */
  readonly radiance: Float32Array
  /** Cloud-free observations per pixel. Zero exactly where state is `no-data`. */
  readonly observations: Uint8Array
  readonly state: readonly PixelState[]
  readonly noDataPixels: number
}

/** Extract the single greyscale byte of a pixel from an RGBA buffer. */
function grey(rgba: Uint8Array | Uint8ClampedArray, index: number): number {
  const byte = rgba[index * 4]
  if (byte === undefined) throw new Error(`pixel ${index} outside buffer`)
  return byte
}

export function tileOrigin(
  geometry: AtlasGeometry,
  tileIndex: number,
): { readonly x: number; readonly y: number } {
  if (tileIndex < 0 || tileIndex >= geometry.tiles) {
    throw new Error(`tile ${tileIndex} outside atlas of ${geometry.tiles}`)
  }
  return {
    x: (tileIndex % geometry.columns) * geometry.tileWidth,
    y: Math.floor(tileIndex / geometry.columns) * geometry.tileHeight,
  }
}

export function atlasSize(geometry: AtlasGeometry): {
  readonly width: number
  readonly height: number
} {
  const rows = Math.ceil(geometry.tiles / geometry.columns)
  return {
    width: geometry.columns * geometry.tileWidth,
    height: rows * geometry.tileHeight,
  }
}

/**
 * Decode one month out of a city stack.
 *
 * Both atlases are required. Passing only radiance is not an overload that
 * exists — the count travels with the value everywhere.
 */
export function decodeFrame(input: {
  radianceRgba: Uint8Array | Uint8ClampedArray
  observationsRgba: Uint8Array | Uint8ClampedArray
  geometry: AtlasGeometry
  tileIndex: number
  radianceScale?: RadianceScale
  observationScale?: ObservationScale
}): DecodedFrame {
  const {
    geometry,
    tileIndex,
    radianceScale = RADIANCE_SCALE,
    observationScale = OBSERVATION_SCALE,
  } = input
  const { width: atlasWidth } = atlasSize(geometry)
  const origin = tileOrigin(geometry, tileIndex)
  const { tileWidth, tileHeight } = geometry

  const radiance = new Float32Array(tileWidth * tileHeight)
  const observations = new Uint8Array(tileWidth * tileHeight)
  const state: PixelState[] = new Array<PixelState>(tileWidth * tileHeight)
  let noDataPixels = 0

  for (let y = 0; y < tileHeight; y += 1) {
    for (let x = 0; x < tileWidth; x += 1) {
      const source = (origin.y + y) * atlasWidth + (origin.x + x)
      const target = y * tileWidth + x
      const observationCode = grey(input.observationsRgba, source)
      const radianceCode = grey(input.radianceRgba, source)

      // A pixel is no-data when the coverage band says nothing was seen there.
      // The radiance byte is not consulted for this — that is the conflation
      // the project exists to prevent.
      if (observationCode === NO_DATA_CODE || radianceCode === NO_DATA_CODE) {
        state[target] = 'no-data'
        radiance[target] = Number.NaN
        observations[target] = 0
        noDataPixels += 1
        continue
      }
      state[target] = 'observed'
      radiance[target] = decodeRadiance(radianceCode, radianceScale)
      observations[target] = decodeObservations(observationCode, observationScale)
    }
  }

  return {
    width: tileWidth,
    height: tileHeight,
    radiance,
    observations,
    state,
    noDataPixels,
  }
}
