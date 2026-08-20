import type { City } from '@/lib/lights/types'

/**
 * The city list: every provincial capital, IKN, and a small curated set of
 * windows worth watching. PRD.md §3.
 *
 * Windows are identical in size for every city — 0.4° square, 96×96 cells at
 * the 15 arc-second VIIRS grid, roughly a 44 km box. A varying window makes
 * cities incomparable, so the span is a constant and only the centre moves.
 *
 * `fireBelt` marks Sumatra and Kalimantan windows, which sit in the peat-fire
 * belt behind the 2015 and 2019 haze events. `coastal` marks windows whose
 * sea area can hold lit fishing boats. Neither flag creates a contamination
 * marker — flags are computed from divergence — they only decide which
 * explanation a computed divergence is given. PRD.md §2.
 */

/** Degrees. Half the window span; 0.2° ≈ 22 km at the equator. */
export const WINDOW_HALF_SPAN = 0.2

/** Cells per side at 15 arc-second resolution (0.4° / (1/240°) ≈ 96). */
export const WINDOW_PX = 96

interface CitySeed {
  readonly id: string
  readonly name: string
  readonly province: string
  readonly lat: number
  readonly lon: number
  readonly coastal: boolean
  readonly fireBelt: boolean
  readonly note?: string
}

const SEEDS: readonly CitySeed[] = [
  // Sumatra
  { id: 'banda-aceh', name: 'Banda Aceh', province: 'Aceh', lat: 5.5483, lon: 95.3238, coastal: true, fireBelt: true },
  { id: 'medan', name: 'Medan', province: 'Sumatera Utara', lat: 3.5952, lon: 98.6722, coastal: true, fireBelt: true },
  { id: 'padang', name: 'Padang', province: 'Sumatera Barat', lat: -0.9471, lon: 100.4172, coastal: true, fireBelt: true },
  { id: 'pekanbaru', name: 'Pekanbaru', province: 'Riau', lat: 0.5071, lon: 101.4478, coastal: false, fireBelt: true, note: 'Riau peatland — among the strongest fire-season divergence in the series.' },
  { id: 'jambi', name: 'Jambi', province: 'Jambi', lat: -1.6101, lon: 103.6131, coastal: false, fireBelt: true },
  { id: 'palembang', name: 'Palembang', province: 'Sumatera Selatan', lat: -2.9761, lon: 104.7754, coastal: false, fireBelt: true },
  { id: 'bengkulu', name: 'Bengkulu', province: 'Bengkulu', lat: -3.7928, lon: 102.2608, coastal: true, fireBelt: true },
  { id: 'bandar-lampung', name: 'Bandar Lampung', province: 'Lampung', lat: -5.3971, lon: 105.2668, coastal: true, fireBelt: true },
  { id: 'pangkalpinang', name: 'Pangkalpinang', province: 'Kepulauan Bangka Belitung', lat: -2.1316, lon: 106.1169, coastal: true, fireBelt: true },
  { id: 'tanjungpinang', name: 'Tanjungpinang', province: 'Kepulauan Riau', lat: 0.9186, lon: 104.4585, coastal: true, fireBelt: false },
  { id: 'batam', name: 'Batam', province: 'Kepulauan Riau', lat: 1.0456, lon: 104.0305, coastal: true, fireBelt: false, note: 'Dense shipping lanes; offshore light is a large part of this window.' },

  // Java and Bali
  { id: 'jakarta', name: 'Jakarta', province: 'DKI Jakarta', lat: -6.2088, lon: 106.8456, coastal: true, fireBelt: false },
  { id: 'serang', name: 'Serang', province: 'Banten', lat: -6.12, lon: 106.1503, coastal: true, fireBelt: false },
  { id: 'bandung', name: 'Bandung', province: 'Jawa Barat', lat: -6.9175, lon: 107.6191, coastal: false, fireBelt: false },
  { id: 'semarang', name: 'Semarang', province: 'Jawa Tengah', lat: -6.9932, lon: 110.4203, coastal: true, fireBelt: false },
  { id: 'yogyakarta', name: 'Yogyakarta', province: 'Daerah Istimewa Yogyakarta', lat: -7.7956, lon: 110.3695, coastal: false, fireBelt: false },
  { id: 'surabaya', name: 'Surabaya', province: 'Jawa Timur', lat: -7.2575, lon: 112.7521, coastal: true, fireBelt: false },
  { id: 'denpasar', name: 'Denpasar', province: 'Bali', lat: -8.6705, lon: 115.2126, coastal: true, fireBelt: false },

  // Nusa Tenggara
  { id: 'mataram', name: 'Mataram', province: 'Nusa Tenggara Barat', lat: -8.5833, lon: 116.1167, coastal: true, fireBelt: false },
  { id: 'kupang', name: 'Kupang', province: 'Nusa Tenggara Timur', lat: -10.1772, lon: 123.607, coastal: true, fireBelt: false },

  // Kalimantan
  { id: 'pontianak', name: 'Pontianak', province: 'Kalimantan Barat', lat: -0.0263, lon: 109.3425, coastal: false, fireBelt: true },
  { id: 'palangkaraya', name: 'Palangka Raya', province: 'Kalimantan Tengah', lat: -2.21, lon: 113.92, coastal: false, fireBelt: true, note: 'Deep peat. Monsoon cloud and fire smoke both cut cloud-free coverage here.' },
  { id: 'banjarmasin', name: 'Banjarmasin', province: 'Kalimantan Selatan', lat: -3.3194, lon: 114.5908, coastal: false, fireBelt: true },
  { id: 'samarinda', name: 'Samarinda', province: 'Kalimantan Timur', lat: -0.5017, lon: 117.1536, coastal: false, fireBelt: true },
  { id: 'balikpapan', name: 'Balikpapan', province: 'Kalimantan Timur', lat: -1.2379, lon: 116.8529, coastal: true, fireBelt: true },
  { id: 'ikn', name: 'IKN Nusantara', province: 'Kalimantan Timur', lat: -0.98, lon: 116.68, coastal: true, fireBelt: true, note: 'Sepaku area. Compare against Balikpapan and Samarinda rather than reading alone.' },
  { id: 'tanjung-selor', name: 'Tanjung Selor', province: 'Kalimantan Utara', lat: 2.8375, lon: 117.3661, coastal: false, fireBelt: true },

  // Sulawesi
  { id: 'manado', name: 'Manado', province: 'Sulawesi Utara', lat: 1.4748, lon: 124.8421, coastal: true, fireBelt: false },
  { id: 'gorontalo', name: 'Gorontalo', province: 'Gorontalo', lat: 0.5435, lon: 123.0568, coastal: true, fireBelt: false },
  { id: 'palu', name: 'Palu', province: 'Sulawesi Tengah', lat: -0.8917, lon: 119.8707, coastal: true, fireBelt: false },
  { id: 'mamuju', name: 'Mamuju', province: 'Sulawesi Barat', lat: -2.6748, lon: 118.8885, coastal: true, fireBelt: false },
  { id: 'makassar', name: 'Makassar', province: 'Sulawesi Selatan', lat: -5.1477, lon: 119.4327, coastal: true, fireBelt: false, note: 'One of the densest light-fishing grounds in the archipelago lies offshore.' },
  { id: 'kendari', name: 'Kendari', province: 'Sulawesi Tenggara', lat: -3.9985, lon: 122.5127, coastal: true, fireBelt: false },

  // Maluku
  { id: 'ambon', name: 'Ambon', province: 'Maluku', lat: -3.6954, lon: 128.1814, coastal: true, fireBelt: false },
  { id: 'sofifi', name: 'Sofifi', province: 'Maluku Utara', lat: 0.7333, lon: 127.5667, coastal: true, fireBelt: false },

  // Papua
  { id: 'manokwari', name: 'Manokwari', province: 'Papua Barat', lat: -0.8615, lon: 134.062, coastal: true, fireBelt: false },
  { id: 'sorong', name: 'Sorong', province: 'Papua Barat Daya', lat: -0.8762, lon: 131.2558, coastal: true, fireBelt: false },
  { id: 'jayapura', name: 'Jayapura', province: 'Papua', lat: -2.533, lon: 140.718, coastal: true, fireBelt: false },
  { id: 'nabire', name: 'Nabire', province: 'Papua Tengah', lat: -3.3585, lon: 135.496, coastal: true, fireBelt: false },
  { id: 'wamena', name: 'Wamena', province: 'Papua Pegunungan', lat: -4.0996, lon: 138.952, coastal: false, fireBelt: false, note: 'Highland valley. Persistent orographic cloud makes this the thinnest coverage in the list.' },
  { id: 'merauke', name: 'Merauke', province: 'Papua Selatan', lat: -8.4932, lon: 140.4018, coastal: true, fireBelt: false },
  { id: 'timika', name: 'Timika', province: 'Papua Tengah', lat: -4.5478, lon: 136.8869, coastal: false, fireBelt: false },
]

function toCity(seed: CitySeed): City {
  return {
    id: seed.id,
    name: seed.name,
    province: seed.province,
    coastal: seed.coastal,
    fireBelt: seed.fireBelt,
    window: {
      west: Number((seed.lon - WINDOW_HALF_SPAN).toFixed(4)),
      south: Number((seed.lat - WINDOW_HALF_SPAN).toFixed(4)),
      east: Number((seed.lon + WINDOW_HALF_SPAN).toFixed(4)),
      north: Number((seed.lat + WINDOW_HALF_SPAN).toFixed(4)),
      widthPx: WINDOW_PX,
      heightPx: WINDOW_PX,
    },
    ...(seed.note === undefined ? {} : { note: seed.note }),
  }
}

/** Sorted by id so the emitted bundle is deterministic. */
export const CITIES: readonly City[] = SEEDS.map(toCity).sort((a, b) => a.id.localeCompare(b.id))

export const CITY_SEEDS = SEEDS

export function cityById(id: string): City | undefined {
  return CITIES.find((city) => city.id === id)
}

/** Shipped comparison preset. PRD.md §7.4. */
export const COMPARE_PRESET: readonly string[] = ['ikn', 'balikpapan', 'samarinda']
