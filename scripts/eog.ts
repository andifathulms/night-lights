/**
 * Talking to the Earth Observation Group distribution.
 *
 * DEV/CI only — none of this ships to the browser.
 *
 * Three things about EOG's distribution shape the code here, and all three
 * were guessed wrong in the first pass:
 *
 *   1. Everything behind `eogdata.mines.edu/nighttime_light/` is authenticated.
 *      An unauthenticated request 302s to a Keycloak login page, so a plain
 *      `/vsicurl/` read of a composite fetches HTML and fails confusingly.
 *      Access needs a free EOG account and a bearer token.
 *   2. Monthly composites are distributed as per-tile `.tgz` archives with an
 *      unpredictable processing-date suffix in the filename. They cannot be
 *      range-read and cannot be URL-constructed; the directory has to be
 *      listed and the archive downloaded whole.
 *   3. Annual composites are gzipped GeoTIFFs. Also not range-readable.
 *
 * Which is why the fetch is a real download of a lot of bytes rather than a
 * clever window read. See `fetch-composites.ts` for the size estimate it
 * prints before starting.
 */

export const EOG_ROOT = process.env.EOG_ROOT ?? 'https://eogdata.mines.edu/nighttime_light'

/**
 * EOG publishes this client id and secret in their own access documentation;
 * they identify the download client, not the user. The account credentials
 * come from the environment and are never written anywhere.
 */
const TOKEN_URL =
  process.env.EOG_TOKEN_URL ?? 'https://eogauth.mines.edu/realms/eog/protocol/openid-connect/token'
const CLIENT_ID = 'eogdata_oidc'
const CLIENT_SECRET = '2677ad81-521b-4869-8480-6d05b9e57d48'

export async function requestToken(): Promise<string> {
  const username = process.env.EOG_USERNAME
  const password = process.env.EOG_PASSWORD
  if (username === undefined || password === undefined) {
    throw new Error(
      'EOG_USERNAME and EOG_PASSWORD are required. Register free at https://eogdata.mines.edu/products/register/',
    )
  }

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'password',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      username,
      password,
    }),
  })

  if (!response.ok) {
    throw new Error(
      response.status === 401
        ? 'EOG rejected those credentials.'
        : `EOG token request failed: ${response.status}`,
    )
  }

  const payload = (await response.json()) as { access_token?: unknown }
  if (typeof payload.access_token !== 'string') {
    throw new Error('EOG token response carried no access_token')
  }
  return payload.access_token
}

/**
 * List one distribution directory.
 *
 * Filenames carry a processing-date suffix — `..._c201510202045.tgz` — that
 * changes per reprocessing and cannot be predicted, so discovery is by
 * listing rather than by constructing a URL.
 */
export async function listDirectory(url: string, token: string): Promise<string[]> {
  const response = await fetch(url, { headers: { authorization: `Bearer ${token}` } })
  if (!response.ok) throw new Error(`listing ${url} failed: ${response.status}`)
  const html = await response.text()
  if (html.includes('openid-connect/auth')) {
    throw new Error(`listing ${url} was redirected to login — the token is not being accepted`)
  }
  const hrefs = [...html.matchAll(/href="([^"?][^"]*)"/g)].map((match) => match[1] ?? '')
  return [...new Set(hrefs.filter((href) => !href.startsWith('/') && !href.startsWith('..')))]
}

/**
 * The global tile grid the monthly composites are cut on: 120° of longitude
 * by 75° of latitude, named for the northern and western corner.
 */
const TILE_LONGITUDES = [
  { name: '180W', west: -180, east: -60 },
  { name: '060W', west: -60, east: 60 },
  { name: '060E', west: 60, east: 180 },
] as const

const TILE_LATITUDES = [
  { name: '75N', south: 0, north: 75 },
  { name: '00N', south: -75, north: 0 },
] as const

export function tilesCovering(bounds: {
  west: number
  south: number
  east: number
  north: number
}): string[] {
  const tiles: string[] = []
  for (const lat of TILE_LATITUDES) {
    for (const lon of TILE_LONGITUDES) {
      const overlaps =
        bounds.west < lon.east &&
        bounds.east > lon.west &&
        bounds.south < lat.north &&
        bounds.north > lat.south
      if (overlaps) tiles.push(`${lat.name}${lon.name}`)
    }
  }
  return tiles
}

export function monthlyDirectory(month: string): string {
  const [year, mm] = [month.slice(0, 4), month.slice(5, 7)]
  // vcmcfg rather than vcmslcfg: the stray-light-corrected variant is not
  // what the annual series is built from, and mixing them would put an
  // artefact into the monthly-versus-annual divergence.
  return `${EOG_ROOT}/monthly/v10/${year}/${year}${mm}/vcmcfg/`
}

export function annualDirectory(year: number): string {
  return `${EOG_ROOT}/annual/v21/${year}/`
}

/** Which band a distributed filename holds, or undefined if it is neither. */
export function bandOf(filename: string): 'radiance' | 'observations' | undefined {
  // Monthly: `avg_rade9h` is the radiance band, `cf_cvg` the cloud-free count.
  // Annual v2.1: `average_masked` is the radiance band with background and
  // ephemeral lights removed; `cf_cvg` is again the count.
  if (filename.includes('avg_rade9h') || filename.includes('average_masked')) return 'radiance'
  if (filename.includes('cf_cvg')) return 'observations'
  return undefined
}
