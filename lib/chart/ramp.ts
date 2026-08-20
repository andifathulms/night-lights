/**
 * The radiance ramp, mirroring the `r1`–`r5` tokens in DESIGN.md §4.
 *
 * Single hue and luminance-monotonic: hue is categorical and radiance is
 * continuous, so a rainbow ramp would invent boundaries that are not in the
 * data. Brightness encoding brightness also means the image looks like what
 * it measures.
 *
 * These live here rather than in a component because Tailwind tokens cannot
 * be sampled from canvas pixel code — this file is the one place the values
 * are repeated, and it is the reason components never need raw hex.
 */
const STOPS: readonly (readonly [number, number, number])[] = [
  [0x1a, 0x2e, 0x42], // r1
  [0x2f, 0x5f, 0x7e], // r2
  [0x5a, 0x97, 0xae], // r3
  [0x9f, 0xcb, 0xd6], // r4
  [0xf2, 0xf6, 0xef], // r5, peak
]

/** `--nodata`. Grey, and deliberately not on the ramp. */
export const NO_DATA_RGB: readonly [number, number, number] = [0x3a, 0x3f, 0x44]

/** `--night`, the ground the hatch sits on. */
export const NIGHT_RGB: readonly [number, number, number] = [0x0c, 0x10, 0x14]

/** Radiance mapped to the top of the ramp when drawing a city window. */
export const DISPLAY_MAX_RADIANCE = 120

export function rampColour(t: number): readonly [number, number, number] {
  const clamped = Math.min(Math.max(t, 0), 1)
  const scaled = clamped * (STOPS.length - 1)
  const lower = Math.floor(scaled)
  const upper = Math.min(lower + 1, STOPS.length - 1)
  const mix = scaled - lower
  const a = STOPS[lower] as readonly [number, number, number]
  const b = STOPS[upper] as readonly [number, number, number]
  return [
    Math.round((a[0] as number) + ((b[0] as number) - (a[0] as number)) * mix),
    Math.round((a[1] as number) + ((b[1] as number) - (a[1] as number)) * mix),
    Math.round((a[2] as number) + ((b[2] as number) - (a[2] as number)) * mix),
  ]
}

/** Perceptual position of a radiance value on the ramp. */
export function rampPosition(radiance: number, max = DISPLAY_MAX_RADIANCE): number {
  return Math.sqrt(Math.min(Math.max(radiance, 0), max) / max)
}
