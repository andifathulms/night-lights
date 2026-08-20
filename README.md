# Cahaya Malam

Fourteen years of VIIRS night lights over Indonesian cities, city by city —
and why a dark pixel usually means the satellite could not see, not that
nothing was there.

Static site, no backend, no runtime network beyond same-origin lazy chunks.
`PRD.md` says what the product is, `DESIGN.md` is authoritative for every
visual decision, and `CLAUDE.md` carries the invariants.

## The one thing to know

The data producer ships a cloud-free observation count with every composite
and instructs users not to read a zero radiance as darkness — and Indonesia is
close to the worst case on Earth for cloud cover. So the count travels with
the radiance value inside one record, a month with no observations is a
different variant of that record with no radiance field at all, and the chart
draws the count as a band directly under the line rather than hiding it in a
tooltip.

That is enforced by the type checker, by the Zod schema, by `data:validate`,
and by `tests/integrity` — four places, because it is the one thing this
project cannot get wrong.

## Getting the data

```bash
pnpm install
pnpm data:build     # builds the bundle into public/data
pnpm dev
```

`data:build` needs composites. It looks for EOG clips under `data/raw/clips`
and, finding none, falls back to a **deterministic stand-in** — so the site
runs immediately, with `provenance: synthetic` in the manifest, a caveat
banner on every page, and validation that rejects the bundle if that caveat is
missing. It is not a measurement and the site never pretends otherwise.

For the real composites:

```bash
pnpm data:fetch     # needs network and GDAL on the path; writes data/raw
pnpm data:build     # picks up the clips automatically
```

Raw composites are never committed, and neither is the generated bundle —
`public/data` is ignored and CI regenerates it before the export.

## Commands

```bash
pnpm dev
pnpm build            # data:validate, then the static export
pnpm preview          # serve ./out under the production basePath
pnpm test:run         # before every commit
pnpm test:integrity   # observation count present, no-data vs dark, quantisation, budgets
pnpm test:flags       # contamination flags computed, not authored
pnpm data:validate    # manifest, citations, per-chunk size budget
pnpm typecheck
pnpm lint
```

`test:integrity`, `test:flags` and `data:validate` gate the build and CI.

## Layout

```
app/[locale]/          id (default), en — jelajah, kota/[slug], banding, perubahan, metode
components/            band, line, scrubber, stack, flags, table, legend, …
lib/lights/            THE CORE. Pure, runs in Node — decode, series, adequacy, divergence, change
lib/chart/             chart geometry and the radiance ramp, computed outside components
data/cities/           city window definitions
scripts/               data:fetch, data:build, data:validate, the PNG encoder
tests/integrity/       tests/flags/
public/data/           generated bundle (ignored)
```

## Attribution

VIIRS Day/Night Band cloud-free composites from the Earth Observation Group,
Payne Institute for Public Policy, Colorado School of Mines. Public domain.

- Elvidge, C.D., Baugh, K., Zhizhin, M., Hsu, F.C., Ghosh, T. (2017). VIIRS
  night-time lights. *International Journal of Remote Sensing* 38(21),
  5860–5879.
- Elvidge, C.D., Zhizhin, M., Ghosh, T., Hsu, F.C., Taneja, J. (2021). Annual
  time series of global VIIRS nighttime lights derived from monthly averages:
  2012 to 2019. *Remote Sensing* 13(5), 922.

## What this is not

Radiance is not development, prosperity or GDP. The relationship is nonlinear
and confounded by lighting technology, sensor view angle, land use and
contamination, and ranking Indonesian regions by anything that reads as
progress is outside this project's business. The change table measures change
in lit area and mean radiance, and is named for that. A copy scan in the test
suite keeps it that way.
