/**
 * Equirectangular projection onto the browse grid.
 *
 * Plate carrée, because that is the grid the composites are distributed on —
 * reprojecting for looks would put the markers somewhere the pixels are not.
 * Computed here rather than in a component. CLAUDE.md invariant 15.
 */

export interface Bounds {
  readonly west: number
  readonly south: number
  readonly east: number
  readonly north: number
}

export function projectToGrid(
  lon: number,
  lat: number,
  bounds: Bounds,
): { readonly x: number; readonly y: number } {
  return {
    x: (lon - bounds.west) / (bounds.east - bounds.west),
    y: (bounds.north - lat) / (bounds.north - bounds.south),
  }
}

export function cityCentre(window: Bounds): { readonly lon: number; readonly lat: number } {
  return {
    lon: (window.west + window.east) / 2,
    lat: (window.south + window.north) / 2,
  }
}

/** Great-circle-free span of a window in kilometres, good enough for a caption. */
export function windowSpanKm(window: Bounds): number {
  const degrees = window.east - window.west
  const latitude = ((window.north + window.south) / 2 * Math.PI) / 180
  return Math.round(degrees * 111.32 * Math.cos(latitude))
}
