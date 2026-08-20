import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { citySeriesSchema, manifestSchema, type Manifest } from './schema'
import type { CitySeries } from '@/lib/lights/types'

/**
 * Build-time reads of the generated bundle.
 *
 * Server components use these to render city pages and to enumerate static
 * paths. Anything a client needs at runtime is fetched from the same origin
 * instead — see `lib/client/bundle.ts`.
 */

const BUNDLE_ROOT = join(process.cwd(), 'public', 'data')

let cachedManifest: Manifest | undefined

export function loadManifest(): Manifest {
  if (cachedManifest === undefined) {
    const raw = readFileSync(join(BUNDLE_ROOT, 'manifest.json'), 'utf8')
    cachedManifest = manifestSchema.parse(JSON.parse(raw))
  }
  return cachedManifest
}

export function loadCitySeries(cityId: string): CitySeries {
  const raw = readFileSync(join(BUNDLE_ROOT, 'series', `${cityId}.json`), 'utf8')
  return citySeriesSchema.parse(JSON.parse(raw))
}

export function loadAllSeries(): CitySeries[] {
  const raw = readFileSync(join(BUNDLE_ROOT, 'series', 'all.json'), 'utf8')
  return (JSON.parse(raw) as unknown[]).map((entry) => citySeriesSchema.parse(entry))
}
