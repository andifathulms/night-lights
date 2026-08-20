import type { DecodedFrame } from '@/lib/lights/decode'
import { NIGHT_RGB, NO_DATA_RGB, rampColour, rampPosition } from '@/lib/chart/ramp'

/**
 * Turn a decoded frame into pixels.
 *
 * Pure, so the rule that matters here is testable: a cell the sensor never
 * saw is painted with the no-data grey in a hatch, never with the bottom of
 * the radiance ramp. A dark cell and an unseen cell must not look alike.
 * CLAUDE.md invariant 2, DESIGN.md §9.
 */
export function paintFrame(frame: DecodedFrame, max?: number): ImageData {
  const pixels = new Uint8ClampedArray(frame.width * frame.height * 4)

  for (let y = 0; y < frame.height; y += 1) {
    for (let x = 0; x < frame.width; x += 1) {
      const index = y * frame.width + x
      const offset = index * 4
      let rgb: readonly [number, number, number]

      if (frame.state[index] === 'no-data') {
        // Hatch at cell resolution: the grid is drawn pixelated, so the
        // diagonal survives upscaling and reads as a pattern rather than a
        // flat tone. Colour alone would not be enough.
        rgb = (x + y) % 6 < 3 ? NO_DATA_RGB : NIGHT_RGB
      } else {
        rgb = rampColour(rampPosition(frame.radiance[index] as number, max))
      }

      pixels[offset] = rgb[0]
      pixels[offset + 1] = rgb[1]
      pixels[offset + 2] = rgb[2]
      pixels[offset + 3] = 255
    }
  }

  return new ImageData(pixels, frame.width, frame.height)
}
