# CLAUDE.md — Cahaya Malam

Nighttime lights explorer for Indonesian cities. Fourteen years of VIIRS DNB composites, city-selectable, with cloud-free observation count carried alongside every radiance value. Static site, GitHub Pages, no backend, no runtime network beyond same-origin lazy chunks.

Read `PRD.md` before starting any task, and **`DESIGN.md` before writing any UI** — it opens with the shared house layer used across these projects.

**Four things shape everything:**

1. **A zero is not darkness.** The data producer's own instruction: it is imperative that users utilise the cloud-free observations file and not assume a value of zero in the average radiance image means no lights were observed. Indonesia is close to the worst case for cloud cover. **Observation count travels with radiance everywhere, enforced by the schema.**
2. **Monthly composites are unfiltered.** They contain fires, lit fishing boats and other temporal lights. Only the annual composites remove them. In Indonesia both contaminants are large.
3. **Radiance is not development.** No prosperity, GDP, growth or achievement framing anywhere. Ranking Indonesian regions by anything reading as progress is politically loaded and outside this project's business.
4. **Chart-first, not map-first.** This is a trend, not a cycle. The line is the hero and the map is the doorway.

---

## Stack

- Next.js 14, App Router, `output: 'export'` — static only
- TypeScript, `strict: true`
- Tailwind CSS, tokens from `DESIGN.md`
- Zod for manifest and series validation
- Vitest
- pnpm
- **No charting library, no mapping library with a tile dependency.** The line, the band and the image stack are the project.
- Fonts via `next/font`, self-hosted.

## Commands

```bash
pnpm dev
pnpm build                  # static export; runs data:validate first
pnpm preview                # serve ./out under the production basePath
pnpm test                   # vitest watch
pnpm test:run               # vitest once — before every commit
pnpm test:integrity         # observation count present, no-data vs dark, quantisation
pnpm test:flags             # contamination flags computed, not authored
pnpm data:fetch             # DEV/CI — pull EOG monthly + annual composites
pnpm data:build             # clip cities, downsample national, quantise, PNG-pack, emit series
pnpm data:validate          # manifest, citations, per-chunk size budget
pnpm typecheck
pnpm lint
```

`pnpm test:integrity`, `pnpm test:flags` and `pnpm data:validate` gate the build and CI.

## Layout

```
app/
  [locale]/                 # id (default), en
    jelajah/                # national overview + city selector
    kota/[slug]/            # the city view — stack + line + band
    banding/                # multi-city comparison
    perubahan/              # change table
    metode/                 # dataset, citation, limitations
components/
  stack/                    # monthly image playback
  line/                     # radiance series
  band/                     # observation count — ALWAYS under the line
  scrubber/                 # shared time control
  flags/                    # contamination markers
  table/                    # chart's text equivalent
lib/
  lights/                   # THE CORE. Pure. Runs in Node.
    decode.ts               # PNG-packed Uint8 → radiance / count via stated scales
    series.ts               # per-city aggregation
    adequacy.ts             # observation-count classification
    divergence.ts           # monthly vs annual, for contamination flags
scripts/
  build-data.ts             # DEV/CI — EOG composites → city stacks + series
data/
  cities/                   # window definitions + metadata
  series/                   # per-city monthly records — loaded upfront
  stacks/                   # per-city PNG stacks — lazy chunks
  overview/                 # downsampled national annual
tests/
  integrity/  flags/
```

## Invariants

1. **Radiance and observation count are one record, never two fields.** The type is `{ radiance, observations, adequacy }` and there is **no path by which a component can render radiance without its count**. This is `PRD.md` §1 enforced by the schema rather than by discipline.

2. **Zero observations is `no-data`, not `dark`.** They are distinct values in the model, distinct colours, distinct patterns, and distinct labels. **Never render them the same way, never let one fall back to the other, never fill a gap.** This is the failure the whole project exists to prevent.

3. **Sparse months render visibly weakened** — reduced stroke weight and opacity below the adequacy threshold — so a low-confidence spike cannot look like a finding.

4. **Monthly layers are labelled unfiltered.** The legend states whether the active layer is monthly (contains fires, boats, temporal lights) or annual (temporal lights removed). Never present monthly data as clean.

5. **Contamination flags are computed from monthly-versus-annual divergence**, never hand-authored. A hand-written flag list drifts from the data; a computed one cannot.

6. **No development, prosperity, GDP, growth, or achievement language** — not in labels, axis titles, tooltips, metadata, or the change table. The metric is **change in lit area and mean radiance**, named in those words. If a proposed string implies a region is doing better or worse, it does not ship.

7. **The change table shows adequacy per city per period.** A city whose comparison years had poor observation coverage is flagged, not silently ranked.

8. **Per-city stacks are lazy chunks.** Series for all cities load upfront; imagery loads only for the selected city. Per-chunk size budget asserted in CI.

9. **Raw composites are never committed.** The pipeline emits quantised PNG stacks and JSON series with stated scales.

10. **`lib/lights` is pure and runs in Node.** No DOM, no React, no clock, no network, no module-level mutable state.

11. **No DMSP data.** The 1992–2013 series needs intercalibration before it can be compared with VIIRS, and splicing them naively is a well-known error. Excluded in v1.

12. **No real-time framing, no outage or disaster detection.** Composites lag and this is a historical record.

13. **Confidence bands are never merged across compared cities.** Each city's band sits under its own line. Merging would hide exactly the case that matters.

14. **EOG, Payne Institute and Elvidge et al. citations appear on the map and in the repository**, structurally.

15. **Nothing is computed in a component.**

## Working style

- **Build the observation band before the radiance line.** M1 exists in that order deliberately. A line without its band is the wrong product, and adding the band later means retrofitting every layout that grew around its absence.
- **Test the no-data case first.** Pick a Kalimantan city in a monsoon month with few usable observations and make sure it renders as no-data, distinctly, before building anything else.
- **When a spike appears in the data, check the observation count and the fire calendar before believing it.** Both are in the record for exactly this reason.
- **When writing any label, check it against invariant 6.** "Fastest growing city" is the string that will try hardest to get written.
- **Keep the city list curated and the windows consistent.** A varying window size makes cities incomparable.
- **Don't touch `next.config.js`, the Actions workflow, `data:validate`, or the adequacy thresholds without saying so explicitly.**
- **Don't add a charting or mapping dependency.**
- **Never weaken a test to make something pass**, especially `test:integrity`.

## Conventions

- Named exports; defaults only where Next requires them.
- Discriminated unions for records, layers and adequacy states, keyed on `type`. Exhaustive `switch` with a `never` default — this is how adding an adequacy state surfaces every site that must handle it.
- No `any`. No non-null `!` in `lib/lights`.
- Radiance in nW/cm²/sr named `*Radiance`. Observation counts named `*Observations`. Months as `YYYY-MM` strings named `*Month`. Lit-area ratio named `litRatio`.
- City ids stable and readable: `ikn`, `balikpapan`, `samarinda`, `sorong`, `batam`. They appear in URLs and share cards.
- Comments cite the dataset version and the EOG publication behind any constant.
- Indonesian first in UI copy; dataset and sensor terms in their standard form.
- Tabular figures on every value.
- Tailwind tokens exactly as in `DESIGN.md` — `night`, `panel`, `rule`, `r1`–`r5`, `line`, `confidence`, `nodata`, `flag`. Never raw hex in components.

## Testing rules

- `pnpm test:run` before every commit; `test:integrity` and `test:flags` before any commit touching `lib/lights` or the pipeline.
- **Every series record asserted to carry an observation count.** A record without one fails validation.
- **No-data and dark asserted distinct** in the model and in rendered output. Both directions.
- Adequacy classification asserted on both sides of the threshold.
- Quantisation round-trips within stated scales for radiance and count.
- Contamination flags asserted to be computed from divergence, not read from a static list.
- City window bounds, dimensions and value ranges asserted against source metadata.
- Change-table entries asserted to carry adequacy for both endpoint periods.
- A copy scan asserts no development, growth, prosperity or achievement language in labels or metadata.
- Per-chunk and total size budgets asserted.
- Determinism: same source version and city definitions produce a byte-identical bundle.
- Bug fix → failing test first.

## Deployment

`main` builds and deploys via Actions; data validation and the integrity suite gate it. `basePath` must match the repository name; `.nojekyll` must exist in `out/`. City stacks ship as lazily-loaded chunks; keep the repository within GitHub's limits. Verify with `pnpm preview` before pushing, and test a city load on a throttled connection before any release.

## Framing

The site states that it shows satellite-observed light rather than development or prosperity, that monthly composites contain fires and lit fishing boats while annual composites do not, that a dark pixel frequently means the satellite could not see through cloud, and that the record is historical rather than current. EOG, the Payne Institute and the Elvidge et al. publications are cited on the map and in the repository. No OIKN or government branding anywhere, including on the IKN city page.

## Current state

M0–M5 implemented. Pipeline, city view with the observation band, browse map
and selector, contamination flags from computed divergence, comparison and
change table, small multiples and method page are all in.

**One thing is outstanding and it is the important one: the shipped bundle is
built from the deterministic stand-in provider, not from EOG composites.**
`pnpm data:fetch` is written and takes the real path — published composites,
GDAL window clips — but has never been run here, so nothing on the site is a
measurement yet. The manifest records `provenance: synthetic`, `data:validate`
rejects a synthetic bundle that omits its caveat, and every page renders the
banner. Running the fetch against EOG and rebuilding is the next task, and
the numbers should be treated as meaningless until it happens.

Two deviations from the layout above, both deliberate:

- The generated bundle is emitted to `public/data/` rather than `data/`, because
  a static export can only serve `public/`. `data/cities/` still holds the city
  definitions, which are the only committed data. `public/data/` is ignored and
  CI regenerates it before the export.
- `app/[locale]/` renders the overview directly, with `jelajah/` re-exporting
  it, so arriving at the site lands on the doorway — two interactions from
  arriving to watching a city light up (PRD.md §11).
