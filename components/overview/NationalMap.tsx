'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { decodeFrame, type AtlasGeometry } from '@/lib/lights/decode'
import { assetUrl, loadStack, type LoadedStack } from '@/lib/client/bundle'
import { paintFrame } from '@/components/stack/paint'
import { cityCentre, projectToGrid } from '@/lib/chart/project'
import type { City } from '@/lib/lights/types'
import type { Locale } from '@/lib/i18n'

/**
 * The browse map: the annual composite, downsampled hard, with the city
 * windows marked.
 *
 * Deliberately plain. This is a doorway, not a destination — the time series
 * is the hero and the map is the reference. DESIGN.md §2, §6.
 */
export function NationalMap({
  cities,
  bounds,
  width,
  height,
  years,
  year,
  path,
  locale,
  highlighted,
}: {
  cities: readonly City[]
  bounds: { west: number; south: number; east: number; north: number }
  width: number
  height: number
  years: readonly number[]
  year: number
  path: string
  locale: Locale
  highlighted?: string
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [stack, setStack] = useState<LoadedStack | undefined>(undefined)

  const geometry: AtlasGeometry = useMemo(
    () => ({ tileWidth: width, tileHeight: height, columns: 1, tiles: years.length }),
    [width, height, years.length],
  )

  useEffect(() => {
    let cancelled = false
    loadStack({
      radiancePath: `${path}.radiance.png`,
      observationsPath: `${path}.observations.png`,
    }).then(
      (loaded) => {
        if (!cancelled) setStack(loaded)
      },
      () => undefined,
    )
    return () => {
      cancelled = true
    }
  }, [path])

  useEffect(() => {
    const canvas = canvasRef.current
    if (canvas === null || stack === undefined) return
    const context = canvas.getContext('2d')
    if (context === null) return
    const tileIndex = Math.max(years.indexOf(year), 0)
    const frame = decodeFrame({
      radianceRgba: stack.radiance.data,
      observationsRgba: stack.observations.data,
      geometry,
      tileIndex,
    })
    // The browse map is a coarse average of a whole year, so it sits much
    // lower on the ramp than a city window; a smaller display maximum keeps
    // the archipelago readable instead of nearly black.
    context.putImageData(paintFrame(frame, 24), 0, 0)
  }, [stack, year, years, geometry])

  return (
    <div className="relative w-full overflow-hidden rounded-sm border border-rule bg-night">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="pixelated block w-full"
        role="img"
        aria-label={`${year}`}
      />
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
      >
        {cities.map((city) => {
          const centre = cityCentre(city.window)
          const point = projectToGrid(centre.lon, centre.lat, bounds)
          const isHighlighted = city.id === highlighted
          return (
            <circle
              key={city.id}
              cx={point.x * width}
              cy={point.y * height}
              r={isHighlighted ? 4 : 2.2}
              className={isHighlighted ? 'fill-line' : 'fill-none stroke-r4'}
              strokeWidth={1}
              opacity={isHighlighted ? 1 : 0.75}
            />
          )
        })}
      </svg>
      {/* Markers are a keyboard-reachable list, not only shapes on a canvas. */}
      <ul className="sr-only">
        {cities.map((city) => (
          <li key={city.id}>
            <Link href={`/${locale}/kota/${city.id}`}>{city.name}</Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
