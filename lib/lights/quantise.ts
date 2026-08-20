/**
 * Quantisation to Uint8, with the scales stated rather than implied.
 *
 * Byte 0 is reserved, in both bands, for "no cloud-free observation here".
 * That reservation is the whole point: a decoded 0 means the satellite could
 * not see, and it must never collide with an observed radiance of zero, which
 * encodes as 1. CLAUDE.md invariant 2.
 */

export interface RadianceScale {
  readonly kind: 'sqrt'
  /** Radiance mapped to the top code, nW/cm²/sr. Values above are clamped. */
  readonly maxRadiance: number
  /** Usable codes, 1..codes. Code 0 is no-data. */
  readonly codes: 255
}

export interface ObservationScale {
  readonly kind: 'linear'
  /** Observations mapped to the top code. Above this, clamped. */
  readonly maxObservations: number
  readonly codes: 255
}

/**
 * Square-root ramp: city cores run two orders of magnitude above village
 * edges, and a linear byte would throw away the low end that this project is
 * mostly about.
 */
export const RADIANCE_SCALE: RadianceScale = { kind: 'sqrt', maxRadiance: 400, codes: 255 }

/** A month rarely exceeds ~31 usable overpasses; the ceiling is generous. */
export const OBSERVATION_SCALE: ObservationScale = {
  kind: 'linear',
  maxObservations: 62,
  codes: 255,
}

/** Byte written where a pixel or month has no cloud-free observation. */
export const NO_DATA_CODE = 0

export function encodeRadiance(radiance: number, scale: RadianceScale = RADIANCE_SCALE): number {
  if (!Number.isFinite(radiance)) throw new Error(`radiance not finite: ${radiance}`)
  const clamped = Math.min(Math.max(radiance, 0), scale.maxRadiance)
  const ratio = Math.sqrt(clamped / scale.maxRadiance)
  return 1 + Math.round(ratio * (scale.codes - 1))
}

export function decodeRadiance(code: number, scale: RadianceScale = RADIANCE_SCALE): number {
  if (code === NO_DATA_CODE) throw new Error('code 0 is no-data and has no radiance')
  const ratio = (code - 1) / (scale.codes - 1)
  return ratio * ratio * scale.maxRadiance
}

/** Largest error `decodeRadiance(encodeRadiance(r))` can introduce at `r`. */
export function radianceQuantisationError(
  radiance: number,
  scale: RadianceScale = RADIANCE_SCALE,
): number {
  const step = 1 / (scale.codes - 1)
  const ratio = Math.sqrt(Math.min(Math.max(radiance, 0), scale.maxRadiance) / scale.maxRadiance)
  const upper = Math.min(ratio + step / 2, 1)
  const lower = Math.max(ratio - step / 2, 0)
  return Math.max(
    Math.abs(upper * upper * scale.maxRadiance - radiance),
    Math.abs(lower * lower * scale.maxRadiance - radiance),
  )
}

export function encodeObservations(
  observations: number,
  scale: ObservationScale = OBSERVATION_SCALE,
): number {
  if (!Number.isInteger(observations) || observations < 0) {
    throw new Error(`observations must be a non-negative integer: ${observations}`)
  }
  if (observations === 0) return NO_DATA_CODE
  const clamped = Math.min(observations, scale.maxObservations)
  return Math.max(1, Math.round((clamped / scale.maxObservations) * scale.codes))
}

export function decodeObservations(
  code: number,
  scale: ObservationScale = OBSERVATION_SCALE,
): number {
  if (code === NO_DATA_CODE) return 0
  return Math.round((code / scale.codes) * scale.maxObservations)
}
