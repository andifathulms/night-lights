'use client'

import { formatMonth, type Locale } from '@/lib/i18n'

/**
 * The shared time control. Moving it moves the image stack and every readout
 * together — image and chart share one scrubber, so there is no way to be
 * looking at one month and reading another. DESIGN.md §6.
 *
 * A native range input, because it is keyboard-operable, announced correctly,
 * and draggable without a line of event handling.
 */
export function Scrubber({
  months,
  index,
  onIndex,
  label,
  locale,
  id,
}: {
  months: readonly string[]
  index: number
  onIndex: (index: number) => void
  label: string
  locale: Locale
  id: string
}) {
  const month = months[index] ?? months[0] ?? ''
  return (
    <div className="flex items-center gap-3">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <input
        id={id}
        type="range"
        min={0}
        max={Math.max(months.length - 1, 0)}
        step={1}
        value={index}
        onChange={(event) => onIndex(Number(event.target.value))}
        aria-valuetext={formatMonth(month, locale)}
        className="h-6 w-full cursor-pointer appearance-none bg-transparent
          [&::-webkit-slider-runnable-track]:h-[2px] [&::-webkit-slider-runnable-track]:bg-rule
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:mt-[-7px]
          [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-[3px]
          [&::-webkit-slider-thumb]:rounded-none [&::-webkit-slider-thumb]:bg-line
          [&::-moz-range-track]:h-[2px] [&::-moz-range-track]:bg-rule
          [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-[3px] [&::-moz-range-thumb]:border-0
          [&::-moz-range-thumb]:rounded-none [&::-moz-range-thumb]:bg-line"
      />
    </div>
  )
}
