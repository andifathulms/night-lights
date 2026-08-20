'use client'

import { useEffect, useRef, useState } from 'react'
import { decodeFrame, type AtlasGeometry } from '@/lib/lights/decode'
import { loadStack, type LoadedStack } from '@/lib/client/bundle'
import { paintFrame } from './paint'
import { formatMonth, type Locale } from '@/lib/i18n'
import type { MonthlyRecord } from '@/lib/lights/types'

/**
 * Every month at once.
 *
 * This is the complete alternative to playback under reduced motion, not a
 * degraded one — a place going from dark to lit is visible in the grid
 * without a frame ever moving. DESIGN.md §7.
 */
export function SmallMultiples({
  geometry,
  radiancePath,
  observationsPath,
  months,
  locale,
  onSelect,
}: {
  geometry: AtlasGeometry
  radiancePath: string
  observationsPath: string
  months: readonly MonthlyRecord[]
  locale: Locale
  onSelect?: (index: number) => void
}) {
  const [stack, setStack] = useState<LoadedStack | undefined>(undefined)

  useEffect(() => {
    let cancelled = false
    loadStack({ radiancePath, observationsPath }).then(
      (loaded) => {
        if (!cancelled) setStack(loaded)
      },
      () => undefined,
    )
    return () => {
      cancelled = true
    }
  }, [radiancePath, observationsPath])

  return (
    <ol className="grid grid-cols-6 gap-1 sm:grid-cols-10 lg:grid-cols-12">
      {months.map((record, index) => (
        <li key={record.month}>
          <button
            type="button"
            onClick={() => onSelect?.(index)}
            className="group block w-full text-left"
            title={`${formatMonth(record.month, locale)} · ${record.observations}`}
          >
            <Thumbnail stack={stack} geometry={geometry} index={index} />
            <span className="mt-1 block font-mono text-[10px] leading-none text-muted">
              {record.month.slice(2)}
              {record.type === 'no-data' ? ' ·' : ''}
            </span>
          </button>
        </li>
      ))}
    </ol>
  )
}

function Thumbnail({
  stack,
  geometry,
  index,
}: {
  stack: LoadedStack | undefined
  geometry: AtlasGeometry
  index: number
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (canvas === null || stack === undefined) return
    const context = canvas.getContext('2d')
    if (context === null) return
    const frame = decodeFrame({
      radianceRgba: stack.radiance.data,
      observationsRgba: stack.observations.data,
      geometry,
      tileIndex: index,
    })
    context.putImageData(paintFrame(frame), 0, 0)
  }, [stack, geometry, index])

  return (
    <canvas
      ref={canvasRef}
      width={geometry.tileWidth}
      height={geometry.tileHeight}
      className="pixelated aspect-square w-full rounded-sm border border-rule bg-night
        transition-[border-color] duration-fast ease-house group-hover:border-r3"
    />
  )
}
