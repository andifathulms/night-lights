import type { City } from '@/lib/lights/types'
import type { CellField, OverviewGrid, SourceProvider } from './types'

/**
 * A deterministic stand-in for the EOG composites.
 *
 * It exists so the site can be built, tested and reviewed without a
 * multi-gigabyte download, and it is emphatically not a measurement. The
 * manifest records `provenance.kind: 'synthetic'` and every page renders that
 * fact — this project would be worthless if it let a modelled field pass for
 * an observed one.
 *
 * What it does model, because the interface has to be exercised against it:
 *
 *   - a settlement core that brightens over the series, at a per-city rate
 *   - tropical cloud, seasonally worst in the northwest monsoon, taking
 *     cloud-free observation counts down and sometimes to zero
 *   - peat-fire light over fire-belt windows in the 2015 and 2019 dry seasons
 *   - lit fishing boats offshore of coastal windows, varying month to month
 *
 * The last two appear only in the monthly field, never the annual one —
 * that is the real relationship between the unfiltered monthly VNL v1 series
 * and the filtered annual series, and it is what the divergence flags read.
 *
 * No clock, no Math.random: the same city and month always produce the same
 * cells, so the bundle is byte-identical across builds.
 */

function hashString(value: string): number {
  let hash = 2166136261
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

/** mulberry32 — small, fast, and seeded explicitly so builds are reproducible. */
function rng(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const FIRE_YEARS = new Set([2015, 2019])
const FIRE_MONTHS = new Set([7, 8, 9, 10])

interface Node {
  readonly x: number
  readonly y: number
  readonly sigma: number
  readonly peak: number
}

/** Settlement geometry for a city: fixed for all time, only brightness moves. */
function settlementNodes(city: City): Node[] {
  const random = rng(hashString(`nodes:${city.id}`))
  const size = city.window.widthPx
  const nodes: Node[] = [
    { x: size / 2, y: size / 2, sigma: size * (0.06 + random() * 0.05), peak: 40 + random() * 60 },
  ]
  const satellites = 2 + Math.floor(random() * 4)
  for (let i = 0; i < satellites; i += 1) {
    nodes.push({
      x: size * (0.2 + random() * 0.6),
      y: size * (0.2 + random() * 0.6),
      sigma: size * (0.02 + random() * 0.04),
      peak: 4 + random() * 18,
    })
  }
  return nodes
}

/** 0 at the start of the series, 1 at the end, logistic and per-city. */
function growth(city: City, fractionThroughSeries: number): number {
  const random = rng(hashString(`growth:${city.id}`))
  const base = 0.35 + random() * 0.4
  const rate = 3 + random() * 6
  const midpoint = 0.3 + random() * 0.5
  const logistic = 1 / (1 + Math.exp(-rate * (fractionThroughSeries - midpoint)))
  return base + (1 - base) * logistic
}

/** Offshore is a half-plane through the window; only coastal windows have one. */
function offshoreMask(city: City, x: number, y: number): boolean {
  if (!city.coastal) return false
  const random = rng(hashString(`coast:${city.id}`))
  const angle = random() * Math.PI * 2
  const size = city.window.widthPx
  const nx = Math.cos(angle)
  const ny = Math.sin(angle)
  const offset = size * (0.28 + random() * 0.12)
  return (x - size / 2) * nx + (y - size / 2) * ny > offset
}

function settlementField(city: City, fractionThroughSeries: number): Float32Array {
  const size = city.window.widthPx
  const cells = new Float32Array(size * size)
  const nodes = settlementNodes(city)
  const scale = growth(city, fractionThroughSeries)
  const texture = rng(hashString(`texture:${city.id}`))
  const speckle = new Float32Array(size * size)
  for (let i = 0; i < speckle.length; i += 1) speckle[i] = texture()

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let value = 0
      for (const node of nodes) {
        const dx = x - node.x
        const dy = y - node.y
        value += node.peak * Math.exp(-(dx * dx + dy * dy) / (2 * node.sigma * node.sigma))
      }
      const index = y * size + x
      if (offshoreMask(city, x, y)) value *= 0.04 // water is dark
      // A little texture so the window does not read as a rendered blob.
      cells[index] = Math.max(0, value * scale * (0.85 + 0.3 * (speckle[index] as number)))
    }
  }
  return cells
}

function monthIndexInYear(month: string): number {
  return Number.parseInt(month.slice(5, 7), 10)
}

/**
 * Cloud-free observation count for the window this month.
 *
 * Indonesia is close to the worst case on Earth for this. The northwest
 * monsoon takes the count down hard, highland windows worse still, and some
 * months come back with nothing usable at all.
 */
function coverage(city: City, month: string): { base: number; cloudBlobs: number } {
  const random = rng(hashString(`cover:${city.id}:${month}`))
  const m = monthIndexInYear(month)
  // Peaks in the dry season (Aug), troughs in the wet season (Jan-Feb).
  const seasonal = Math.cos(((m - 8) / 12) * Math.PI * 2)
  const equatorial = Math.abs((city.window.north + city.window.south) / 2) < 3 ? 0.8 : 1
  const base = Math.max(0, (14 + 9 * seasonal) * equatorial * (0.6 + random() * 0.8))
  // Some months never clear over a window at all. Those come back with no
  // usable observation anywhere, and they are the case the whole product is
  // built around, so the stand-in has to produce them.
  const washoutChance = 0.02 + 0.07 * Math.max(0, -seasonal)
  if (random() < washoutChance) return { base: 0, cloudBlobs: 0 }
  return { base, cloudBlobs: 1 + Math.floor(random() * 4) }
}

function observationField(city: City, month: string): Uint8Array {
  const size = city.window.widthPx
  const counts = new Uint8Array(size * size)
  const { base, cloudBlobs } = coverage(city, month)
  const random = rng(hashString(`obs:${city.id}:${month}`))

  const blobs = Array.from({ length: cloudBlobs }, () => ({
    x: random() * size,
    y: random() * size,
    sigma: size * (0.1 + random() * 0.35),
    depth: 0.5 + random() * 0.8,
  }))

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let value = base
      for (const blob of blobs) {
        const dx = x - blob.x
        const dy = y - blob.y
        value -= base * blob.depth * Math.exp(-(dx * dx + dy * dy) / (2 * blob.sigma * blob.sigma))
      }
      counts[y * size + x] = Math.max(0, Math.min(62, Math.round(value)))
    }
  }
  return counts
}

/** Fire light: bright, diffuse, seasonal, and absent from the annual composite. */
function addFireLight(city: City, month: string, cells: Float32Array): void {
  if (!city.fireBelt) return
  const year = Number.parseInt(month.slice(0, 4), 10)
  const m = monthIndexInYear(month)
  if (!FIRE_MONTHS.has(m)) return
  const severe = FIRE_YEARS.has(year)
  const random = rng(hashString(`fire:${city.id}:${month}`))
  if (!severe && random() > 0.45) return

  const size = city.window.widthPx
  const fronts = (severe ? 4 : 1) + Math.floor(random() * 3)
  for (let i = 0; i < fronts; i += 1) {
    const cx = random() * size
    const cy = random() * size
    const sigma = size * (0.05 + random() * 0.12)
    const peak = (severe ? 90 : 25) * (0.6 + random())
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        if (offshoreMask(city, x, y)) continue
        const dx = x - cx
        const dy = y - cy
        const index = y * size + x
        cells[index] =
          (cells[index] as number) + peak * Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma))
      }
    }
  }
}

/** Lit fishing boats: point sources offshore, in a different place every month. */
function addBoatLight(city: City, month: string, cells: Float32Array): void {
  if (!city.coastal) return
  const random = rng(hashString(`boats:${city.id}:${month}`))
  const size = city.window.widthPx
  const boats = 10 + Math.floor(random() * 70)
  for (let i = 0; i < boats; i += 1) {
    const x = Math.floor(random() * size)
    const y = Math.floor(random() * size)
    if (!offshoreMask(city, x, y)) continue
    const index = y * size + x
    cells[index] = (cells[index] as number) + 30 + random() * 140
  }
}

export function createSyntheticProvider(input: {
  months: readonly string[]
  cities: readonly City[]
  sourceVersion: string
}): SourceProvider {
  const fractionOf = (month: string): number => {
    const index = input.months.indexOf(month)
    if (index < 0) throw new Error(`month outside the series: ${month}`)
    return input.months.length === 1 ? 1 : index / (input.months.length - 1)
  }

  return {
    kind: 'synthetic',
    monthlyProduct: 'Stand-in for VIIRS DNB VNL v1 monthly (unfiltered)',
    annualProduct: 'Stand-in for VIIRS DNB VNL v2.1 annual (temporal lights removed)',
    sourceVersion: input.sourceVersion,
    caveat:
      'Bundel ini dibangun dari data pengganti yang dihasilkan secara deterministik, bukan dari citra satelit. ' +
      'Angka di situs ini tidak mengukur apa pun. Jalankan `pnpm data:fetch` lalu `pnpm data:build` untuk komposit EOG yang sebenarnya.',

    async monthly(city, month) {
      const cells = settlementField(city, fractionOf(month))
      // Order matters only for readability; both are additive temporal light.
      addFireLight(city, month, cells)
      addBoatLight(city, month, cells)
      return { radiance: cells, observations: observationField(city, month) }
    },

    async annual(city, year) {
      // Filtered: settlement only. No fires, no boats — that is the whole
      // difference between the two products, and the flags depend on it.
      const monthsOfYear = input.months.filter((month) => month.startsWith(String(year)))
      if (monthsOfYear.length === 0) throw new Error(`no months for ${year}`)
      const size = city.window.widthPx
      const summed = new Float32Array(size * size)
      const observations = new Uint8Array(size * size)
      const counts = new Float32Array(size * size)

      for (const month of monthsOfYear) {
        const field = settlementField(city, fractionOf(month))
        const monthObservations = observationField(city, month)
        for (let i = 0; i < summed.length; i += 1) {
          const seen = monthObservations[i] as number
          if (seen === 0) continue
          summed[i] = (summed[i] as number) + (field[i] as number)
          counts[i] = (counts[i] as number) + 1
          observations[i] = Math.min(255, (observations[i] as number) + seen)
        }
      }

      const radiance = new Float32Array(size * size)
      for (let i = 0; i < radiance.length; i += 1) {
        const seenMonths = counts[i] as number
        radiance[i] = seenMonths === 0 ? 0 : (summed[i] as number) / seenMonths
      }
      return { radiance, observations }
    },

    async overview(year, grid: OverviewGrid) {
      const monthsOfYear = input.months.filter((month) => month.startsWith(String(year)))
      const middle = monthsOfYear[Math.floor(monthsOfYear.length / 2)]
      if (middle === undefined) throw new Error(`no months for ${year}`)
      return syntheticOverview({
        cities: input.cities,
        fractionThroughSeries: fractionOf(middle),
        grid,
      })
    },
  }
}

/**
 * The national browse grid, built by splatting each city's annual settlement
 * field onto the archipelago plus a faint diffuse background. Same stand-in
 * caveat as everything else here.
 */
export function syntheticOverview(input: {
  cities: readonly City[]
  fractionThroughSeries: number
  grid: { west: number; south: number; east: number; north: number; width: number; height: number }
}): CellField {
  const { grid } = input
  const radiance = new Float32Array(grid.width * grid.height)
  const observations = new Uint8Array(grid.width * grid.height)
  const random = rng(hashString(`overview:${input.fractionThroughSeries.toFixed(4)}`))

  const toPixel = (lon: number, lat: number): { x: number; y: number } => ({
    x: ((lon - grid.west) / (grid.east - grid.west)) * grid.width,
    y: ((grid.north - lat) / (grid.north - grid.south)) * grid.height,
  })

  for (const city of input.cities) {
    const centreLon = (city.window.west + city.window.east) / 2
    const centreLat = (city.window.south + city.window.north) / 2
    const { x: cx, y: cy } = toPixel(centreLon, centreLat)
    const nodes = settlementNodes(city)
    const peak = (nodes[0]?.peak ?? 40) * growth(city, input.fractionThroughSeries)
    const sigma = 2.5 + peak / 40

    const radius = Math.ceil(sigma * 4)
    for (let dy = -radius; dy <= radius; dy += 1) {
      for (let dx = -radius; dx <= radius; dx += 1) {
        const x = Math.round(cx) + dx
        const y = Math.round(cy) + dy
        if (x < 0 || y < 0 || x >= grid.width || y >= grid.height) continue
        const index = y * grid.width + x
        radiance[index] =
          (radiance[index] as number) + peak * Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma))
      }
    }
  }

  // Annual composites stack a year of overpasses, so coverage is good almost
  // everywhere — but not everywhere, and the browse map shows where it is not.
  for (let i = 0; i < observations.length; i += 1) {
    const value = 30 + random() * 32
    observations[i] = random() < 0.004 ? 0 : Math.round(value)
    if (observations[i] === 0) radiance[i] = 0
  }
  return { radiance, observations }
}
