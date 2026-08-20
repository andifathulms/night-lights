import { IBM_Plex_Mono, Inter, Space_Grotesk } from 'next/font/google'

/**
 * Self-hosted through next/font: the files are emitted into the export and
 * served from the same origin, so the site works offline after first load and
 * makes no runtime request to anyone. DESIGN.md §1, §5.
 */

export const display = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-display',
  display: 'swap',
})

export const body = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-body',
  display: 'swap',
})

export const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-mono',
  display: 'swap',
})
