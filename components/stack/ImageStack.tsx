'use client'

import { useEffect, useRef, useState } from 'react'
import { decodeFrame, type AtlasGeometry } from '@/lib/lights/decode'
import { loadStack, type LoadedStack } from '@/lib/client/bundle'
import { paintFrame } from './paint'

/**
 * The city window, month by month.
 *
 * The stack is a lazy chunk: two greyscale atlases fetched only when this
 * city is opened. CLAUDE.md invariant 8. Both planes are requested together —
 * the frame cannot be painted from radiance alone, because which cells the
 * satellite actually saw is what decides how they are drawn.
 */
export function ImageStack({
  geometry,
  radiancePath,
  observationsPath,
  index,
  alt,
  loadingLabel,
}: {
  geometry: AtlasGeometry
  radiancePath: string
  observationsPath: string
  index: number
  alt: string
  loadingLabel: string
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [stack, setStack] = useState<LoadedStack | undefined>(undefined)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    loadStack({ radiancePath, observationsPath })
      .then((loaded) => {
        if (!cancelled) setStack(loaded)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [radiancePath, observationsPath])

  useEffect(() => {
    const canvas = canvasRef.current
    if (canvas === null || stack === undefined) return
    const context = canvas.getContext('2d')
    if (context === null) return

    const frame = decodeFrame({
      radianceRgba: stack.radiance.data,
      observationsRgba: stack.observations.data,
      geometry,
      tileIndex: Math.min(Math.max(index, 0), geometry.tiles - 1),
    })
    context.putImageData(paintFrame(frame), 0, 0)
  }, [stack, index, geometry])

  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-sm border border-rule bg-night">
      <canvas
        ref={canvasRef}
        width={geometry.tileWidth}
        height={geometry.tileHeight}
        className="pixelated h-full w-full"
        aria-label={alt}
        role="img"
      />
      {stack === undefined && !failed ? (
        <p className="absolute inset-0 grid place-items-center font-mono text-xs text-muted">
          {loadingLabel}
        </p>
      ) : null}
      {failed ? (
        <p className="hatch-nodata absolute inset-0 grid place-items-center font-mono text-xs text-muted">
          {loadingLabel}
        </p>
      ) : null}
    </div>
  )
}
