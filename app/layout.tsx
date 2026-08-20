import type { Metadata } from 'next'
import { body, display, mono } from './fonts'
import './globals.css'

export const metadata: Metadata = {
  title: 'Cahaya Malam',
  description:
    'Fourteen years of VIIRS night lights over Indonesian cities, with the cloud-free observation count beside every radiance value.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body className="min-h-screen">{children}</body>
    </html>
  )
}
