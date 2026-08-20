import Link from 'next/link'
import { copyFor } from '@/lib/i18n/copy'
import { otherLocale, type Locale } from '@/lib/i18n'

export function Nav({ locale, current }: { locale: Locale; current?: string }) {
  const copy = copyFor(locale)
  const items = [
    { href: `/${locale}/jelajah`, label: copy.nav.browse, key: 'browse' },
    { href: `/${locale}/banding`, label: copy.nav.compare, key: 'compare' },
    { href: `/${locale}/perubahan`, label: copy.nav.change, key: 'change' },
    { href: `/${locale}/metode`, label: copy.nav.method, key: 'method' },
  ]

  return (
    <header className="border-b border-rule">
      <div className="mx-auto flex max-w-6xl flex-wrap items-baseline gap-x-6 gap-y-2 px-4 py-4">
        <Link href={`/${locale}`} className="font-display text-md tracking-tight">
          {copy.siteName}
        </Link>
        <nav className="flex flex-wrap gap-x-5 gap-y-1 text-base">
          {items.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              aria-current={current === item.key ? 'page' : undefined}
              className={`transition-colors duration-fast ease-house hover:text-r4 ${
                current === item.key ? 'text-line' : 'text-muted'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <Link
          href={`/${otherLocale(locale)}`}
          className="ml-auto font-mono text-xs text-muted transition-colors duration-fast ease-house hover:text-r4"
        >
          {copy.nav.switchLanguage}
        </Link>
      </div>
    </header>
  )
}
