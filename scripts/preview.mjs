import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'

/**
 * Serves ./out under the production basePath, so the export is verified the
 * way GitHub Pages will actually serve it. PRD.md §12.
 */

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '/night-lights'
const ROOT = join(process.cwd(), 'out')
const PORT = Number(process.env.PORT ?? 4173)

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
}

async function resolve(pathname) {
  if (!pathname.startsWith(BASE_PATH)) return undefined
  const relative = normalize(pathname.slice(BASE_PATH.length) || '/').replace(/^(\.\.[/\\])+/, '')
  const candidates = [join(ROOT, relative), join(ROOT, relative, 'index.html'), `${join(ROOT, relative)}.html`]
  for (const candidate of candidates) {
    const info = await stat(candidate).catch(() => undefined)
    if (info?.isFile()) return candidate
  }
  return undefined
}

createServer(async (request, response) => {
  const { pathname } = new URL(request.url ?? '/', 'http://localhost')
  const file = await resolve(decodeURIComponent(pathname))
  if (file === undefined) {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
    response.end(pathname === '/' ? `Serving under ${BASE_PATH}/\n` : 'Not found\n')
    return
  }
  response.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' })
  response.end(await readFile(file))
}).listen(PORT, () => {
  process.stdout.write(`preview: http://localhost:${PORT}${BASE_PATH}/\n`)
})
