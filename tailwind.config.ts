import type { Config } from 'tailwindcss'

/**
 * Tokens are DESIGN.md §4–§7, verbatim. Components use these names only —
 * raw hex in a component is a review failure (CLAUDE.md, Conventions).
 */
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        night: '#0C1014',
        panel: '#141A20',
        rule: '#212A32',
        r1: '#1A2E42',
        r2: '#2F5F7E',
        r3: '#5A97AE',
        r4: '#9FCBD6',
        r5: '#F2F6EF',
        line: '#E8C15A',
        confidence: '#4E6B7A',
        nodata: '#3A3F44',
        flag: '#C2703A',
        ink: '#E4EAEF',
        muted: '#8D9AA5',
      },
      fontFamily: {
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
        body: ['var(--font-body)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        // 1.25 ratio, floor 16 for anything a reader must read. DESIGN.md §5.
        xs: ['14px', { lineHeight: '1.45' }],
        base: ['16px', { lineHeight: '1.55' }],
        md: ['18px', { lineHeight: '1.5' }],
        lg: ['22px', { lineHeight: '1.35' }],
        xl: ['28px', { lineHeight: '1.25' }],
        '2xl': ['36px', { lineHeight: '1.15' }],
        '3xl': ['46px', { lineHeight: '1.08' }],
      },
      spacing: {
        1: '4px', 2: '8px', 3: '12px', 4: '16px', 6: '24px',
        8: '32px', 12: '48px', 16: '64px', 24: '96px', 32: '128px',
      },
      borderRadius: { DEFAULT: '2px', none: '0', sm: '2px', md: '2px', lg: '2px' },
      transitionTimingFunction: { house: 'cubic-bezier(0.2, 0, 0, 1)' },
      transitionDuration: { fast: '120ms', state: '240ms', frame: '280ms', orchestrated: '560ms' },
    },
  },
  plugins: [],
}

export default config
