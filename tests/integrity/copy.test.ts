import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { extname, join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * A copy scan.
 *
 * Radiance is not development, prosperity or GDP, and ranking Indonesian
 * regions by anything that reads as progress is outside this project's
 * business. PRD.md §5, CLAUDE.md invariant 6. "Kota dengan pertumbuhan
 * tercepat" is the string that will try hardest to get written, so a test
 * watches for it rather than a reviewer.
 *
 * The scan reads string literals out of everything that produces UI text. A
 * literal that explicitly denies the framing — "cahaya bukan pembangunan" —
 * is what the method page is for, so negations are allowed through.
 */

const SCANNED_DIRECTORIES = ['app', 'components', 'lib/i18n', 'data/cities']

const BANNED = [
  /\bpembangunan\b/i,
  /\bpertumbuhan\b/i,
  /\bbertumbuh\b/i,
  /\bkemakmuran\b/i,
  /\bkesejahteraan\b/i,
  /\bkemajuan\b/i,
  /\bmaju\b/i,
  /\bPDB\b/,
  /\bPDRB\b/,
  /\bGDP\b/i,
  /\bgrowth\b/i,
  /\bgrowing\b/i,
  /\bdevelopment\b/i,
  /\bdeveloping\b/i,
  /\bprosperity\b/i,
  /\bprosperous\b/i,
  /\bthriving\b/i,
  /\belectrification\b/i,
  /\belektrifikasi\b/i,
  /\bachievement\b/i,
  /\bprestasi\b/i,
  /\btertinggal\b/i,
]

/** Phrases that mark a literal as denying the framing rather than using it. */
const NEGATIONS = [/\bbukan\b/i, /\btidak\b/i, /\bnot\b/i, /\bnever\b/i, /\brather than\b/i, /\bno\b/i]

function sourceFiles(directory: string): string[] {
  const root = join(process.cwd(), directory)
  if (!existsSync(root)) return []
  const files: string[] = []
  for (const entry of readdirSync(root, { withFileTypes: true, recursive: true })) {
    if (!entry.isFile()) continue
    if (!['.ts', '.tsx'].includes(extname(entry.name))) continue
    files.push(join(entry.parentPath ?? root, entry.name))
  }
  return files
}

/** String and template literals, which is where user-visible text lives. */
function literals(source: string): string[] {
  const matches = source.match(/'[^'\n]*'|"[^"\n]*"|`[^`]*`/g) ?? []
  return matches.map((literal) => literal.slice(1, -1))
}

describe('no development, prosperity or growth language reaches the interface', () => {
  const offenders: string[] = []

  for (const directory of SCANNED_DIRECTORIES) {
    for (const file of sourceFiles(directory)) {
      const source = readFileSync(file, 'utf8')
      for (const literal of literals(source)) {
        if (NEGATIONS.some((negation) => negation.test(literal))) continue
        for (const banned of BANNED) {
          if (banned.test(literal)) {
            offenders.push(`${file.replace(process.cwd() + '/', '')}: ${literal.trim()}`)
          }
        }
      }
    }
  }

  it('finds none', () => {
    expect(offenders).toEqual([])
  })

  it('actually scanned something, so a passing run means something', () => {
    const scanned = SCANNED_DIRECTORIES.flatMap(sourceFiles)
    expect(scanned.length).toBeGreaterThan(0)
  })
})
