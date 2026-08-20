'use client'

import { citySeriesSchema } from '@/lib/data/schema'
import type { CitySeries } from '@/lib/lights/types'

/**
 * Same-origin runtime loads.
 *
 * Series for every city load once and are shared, so browsing and comparison
 * are instant; imagery is per-city and lazy. PRD.md §3, CLAUDE.md invariant 8.
 * There is no other network access anywhere in the app.
 */

export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? ''

export function assetUrl(path: string): string {
  return `${BASE_PATH}/data/${path}`
}

let allSeriesPromise: Promise<CitySeries[]> | undefined

export function loadAllSeries(): Promise<CitySeries[]> {
  allSeriesPromise ??= fetch(assetUrl('series/all.json'))
    .then((response) => {
      if (!response.ok) throw new Error(`series/all.json: ${response.status}`)
      return response.json() as Promise<unknown[]>
    })
    .then((entries) => entries.map((entry) => citySeriesSchema.parse(entry)))
  return allSeriesPromise
}

const imageCache = new Map<string, Promise<ImageData>>()

/**
 * Load one plane of a stack and hand back its pixels.
 *
 * Radiance and observation planes are always requested as a pair by the
 * caller; there is no helper here that returns one alone, because a frame
 * cannot be drawn from radiance without knowing what was seen.
 */
function loadPlane(path: string): Promise<ImageData> {
  const cached = imageCache.get(path)
  if (cached !== undefined) return cached

  const promise = new Promise<ImageData>((resolve, reject) => {
    const image = new Image()
    image.decoding = 'async'
    image.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = image.naturalWidth
      canvas.height = image.naturalHeight
      const context = canvas.getContext('2d', { willReadFrequently: true })
      if (context === null) {
        reject(new Error('no 2d context'))
        return
      }
      context.drawImage(image, 0, 0)
      resolve(context.getImageData(0, 0, canvas.width, canvas.height))
    }
    image.onerror = () => reject(new Error(`could not load ${path}`))
    image.src = assetUrl(path)
  })

  imageCache.set(path, promise)
  return promise
}

export interface LoadedStack {
  readonly radiance: ImageData
  readonly observations: ImageData
}

export async function loadStack(input: {
  radiancePath: string
  observationsPath: string
}): Promise<LoadedStack> {
  const [radiance, observations] = await Promise.all([
    loadPlane(input.radiancePath),
    loadPlane(input.observationsPath),
  ])
  return { radiance, observations }
}
