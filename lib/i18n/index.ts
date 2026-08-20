export const LOCALES = ['id', 'en'] as const

export type Locale = (typeof LOCALES)[number]

export const DEFAULT_LOCALE: Locale = 'id'

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value)
}

export function otherLocale(locale: Locale): Locale {
  return locale === 'id' ? 'en' : 'id'
}

/** Month labels. Indonesian first — the UI is Indonesian-first by default. */
const MONTH_NAMES: Record<Locale, readonly string[]> = {
  id: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
}

export function formatMonth(month: string, locale: Locale): string {
  const index = Number.parseInt(month.slice(5, 7), 10) - 1
  return `${MONTH_NAMES[locale][index] ?? month.slice(5, 7)} ${month.slice(0, 4)}`
}

/** Fixed decimals so a readout cannot change width mid-playback. */
export function formatRadiance(value: number): string {
  return value.toFixed(2)
}

export function formatRatio(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

export function formatSigned(value: number, digits = 2): string {
  const fixed = value.toFixed(digits)
  return value > 0 ? `+${fixed}` : fixed
}
