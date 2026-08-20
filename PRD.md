# PRD — Cahaya Malam

**Fourteen years of satellite night imagery, city by city. Watch Indonesian towns light up — and learn why a dark pixel usually means the satellite couldn't see, not that nothing was there.**

| | |
|---|---|
| **Status** | Draft — pre-implementation |
| **Owner** | Andi Fathul Mukminin Salahuddin |
| **Type** | Personal portfolio project, open source, analytical |
| **Deployment** | GitHub Pages (static export, no server, no runtime network) |
| **Language** | Indonesian-first UI; English secondary |
| **Data** | VIIRS DNB composites, Earth Observation Group / Payne Institute, Colorado School of Mines — public domain |
| **Design** | See `DESIGN.md`. Authoritative for every visual decision. |

*Name: explanatory. Alternatives: **Nyala Kota**, **Night Lights**.*

---

## 1. The instruction that comes with the data

EOG states this themselves, and it is aimed squarely at places like Indonesia:

> In the monthly composites there are many areas where it is impossible to get good quality data coverage for that month. This can be due to cloud cover, **especially in the tropical regions**. Therefore it is imperative that users utilise the cloud-free observations file and **not assume a value of zero in the average radiance image means that no lights were observed.**

Every composite ships with a companion band counting cloud-free observations per pixel. **Using it is the documented requirement, not a nicety** — and Indonesia is close to the worst case on Earth for cloud cover.

**This is the product's central honesty mechanism.** A radiance value from a month with three usable observations is not comparable to one from a month with twenty, and the interface never shows the first without the second.

## 2. What else is in the light

VIIRS DNB detects lighting from cities, towns, villages, combustion sources and **lit fishing boats**. And critically: **the version 1 monthly composites have not been filtered to screen out lights from aurora, fires, boats and other temporal lights.** Only the annual composites carry layers removing temporal lights and background.

For Indonesia that means two large contaminants sitting inside the monthly data:

**The fishing fleet.** Indonesian waters carry one of the world's largest light-fishing fleets. A coastal city's window will contain boat lights offshore that look nothing like settlement growth but read as brightness.

**Peat fires.** The 2015 and 2019 haze events appear as vast bright anomalies across Sumatra and Kalimantan. Read as development, they would be a completely false finding.

**So source separation is the analysis, not a cleanup step.** Monthly gives temporal detail with contamination; annual gives cleaned settlement light. Showing both, and showing where they disagree, is the intellectual content.

## 3. The size constraint, and what it forces

Indonesia's bounding box at 15 arc-second resolution is roughly 45 million cells per layer, across more than 160 monthly layers since 2012. **National monthly imagery cannot be shipped.** This is arithmetic, not a compression problem.

The architecture that follows:

| Layer | What ships | Size |
|---|---|---|
| **National overview** | Annual composites, heavily downsampled, for browsing | A few MB total |
| **Per-city imagery** | ~40 km window at native resolution, full monthly series, **lazy-loaded per city** | 1–2 MB each |
| **Per-city time series** | Mean radiance, lit-area ratio, and observation count per month | Tiny — all cities load at once |

The city selector becomes the entry point by necessity, and that is the right shape anyway.

**City list:** all provincial capitals, IKN, and a curated set of cases worth watching — Batam, Sorong, Timika, Palangkaraya, Balikpapan, Samarinda. Around forty, extensible.

## 4. What city selection unlocks

**Comparison.** Any two cities on the same radiance axis, with their observation-count bands beneath. This is the feature the national-only version could not offer.

**Change ranking.** Which Indonesian cities lit up most between 2012 and now. The most shareable output in the project — and the most dangerous, which is why §5 governs how it is expressed.

## 5. The interpretive rule

**Radiance is not development, prosperity, or GDP.**

The relationship is nonlinear, confounded by lighting technology, sensor view angle, land use and contamination. And in Indonesia, ranking regions by anything that reads as "progress" is politically loaded in a way this project has no business entering.

**So the ranking measures change in lit area and mean radiance, and says so in those words.** Never "growth", never "development", never "the fastest-developing city". The metric is named for what it measures — light — and the method page states plainly what light does and does not indicate.

## 6. Non-goals

- **No development, poverty, GDP, or electrification claims.** §5.
- **No policy commentary, no regional ranking framed as achievement or failure.**
- **No real-time or recent-month monitoring.** Composites lag; this is a historical record.
- **No disaster or outage detection.** That is an operational product and a wrong answer has real consequences.
- **No DMSP-era data in v1.** The 1992–2013 series needs intercalibration to be comparable with VIIRS, and splicing them naively is a classic error.
- **No accounts, no server, no runtime network.**
- **No ML.**

## 7. Features

### 7.1 The city view
The signature screen. Three elements sharing one time axis:

- **The image stack** — the city's 40 km window, month by month, playable.
- **The radiance line** — mean radiance and lit-area ratio over time.
- **The observation band, directly beneath the line** — cloud-free observation count per month, on the same axis.

**Confidence is read at the same glance as value.** Sparse months visibly thin the line rather than being footnoted. §1.

### 7.2 Contamination flags
Months where fire or boat contamination is likely are marked on the timeline: fire-season months for Sumatra and Kalimantan cities, and coastal windows where offshore lights are present. Where the monthly and annual composites disagree sharply, that disagreement is itself flagged.

### 7.3 The national overview
Annual composites, coarse, as the browse map. Cities marked and searchable. Not the product — the way in.

### 7.4 Comparison
Two to four cities, one radiance axis, observation bands stacked beneath. IKN against Balikpapan and Samarinda is a shipped preset.

### 7.5 Change table
Cities ranked by change in lit area and mean radiance between two chosen years, with observation-count adequacy shown per city and per period. Expressed strictly per §5.

### 7.6 Small multiples
One city, sixty-plus monthly frames as a grid. A place going from dark to lit, all visible at once.

### 7.7 Method page
Dataset versions, the EOG citation, the observation-count requirement, monthly-versus-annual filtering, contamination sources, the size constraint, and §5 in full.

## 8. Architecture

Static Next.js 14 App Router export. No backend, no runtime network beyond lazy city chunks served from the same origin.

```
EOG monthly + annual composites (build time)
  → clip to city windows + downsample national annual
  → quantise radiance and observation count to Uint8 with stated scales
  → PNG-pack per city stack; emit per-city time series JSON
  → overview | city view | compare | change table
```

**Per-city stacks are separate chunks, loaded on demand.** Time series for all cities load upfront so browsing and comparison are instant.

**`lib/lights` is pure** — decode, scale, aggregate, adequacy classification. Runs in Node, testable.

**Observation count travels with radiance everywhere.** They are one record in the data model, never separate fields that a component could render independently. §1 is enforced by the schema.

**Attribution is structural.** EOG, the Payne Institute, and the Elvidge et al. citations appear on the map and in the repository.

## 9. Testing

**Observation count is mandatory.** Every radiance record must carry its observation count. **A record without one fails validation** — there is no path by which a value renders unaccompanied.

**Zero is never treated as dark.** Asserted: a pixel or month with zero observations is classified as *no data*, distinct from *observed and dark*. The two must be visually and semantically different everywhere.

**Quantisation round-trips** within its stated scale for both radiance and count.

**Adequacy thresholds** classify months into usable and sparse bands, asserted on both sides.

**Monthly-versus-annual divergence** is computed, not hand-flagged, so contamination markers cannot drift from the data.

**Grid integrity** — city window bounds, dimensions and value ranges asserted against source metadata.

**Determinism.** Same source version and city definitions produce a byte-identical bundle.

**Size budget** asserted per city chunk and for the national overview.

## 10. Milestones

| | | |
|---|---|---|
| **M0** | Pipeline | Scaffold; EOG fetch, city clipping, downsampling, quantisation, PNG packing; manifest with versions and citations; size budget met. |
| **M1** | The city view | Image stack, radiance line, **observation band**, playback. Ship nothing before the band exists. |
| **M2** | Browse | National overview, city selector, search. **Ship publicly here.** |
| **M3** | Honesty | Contamination flags, monthly-versus-annual divergence, adequacy classification. |
| **M4** | Comparison | Multi-city axis, IKN preset, change table per §5. |
| **M5** | Depth | Small multiples, method page, sharing. |

## 11. Success criteria

- No radiance value renders anywhere without its observation count.
- No-data and observed-dark are visually and semantically distinct throughout.
- Contamination flags are computed from monthly-versus-annual divergence, not hand-authored.
- No development, prosperity, or GDP language anywhere in the product.
- The change table is expressed as change in light, named as such.
- Per-city chunks stay within budget; the app is usable on a slow connection.
- EOG attribution and citations present on the map and in the repository.
- A visitor can go from arriving to watching a city light up in two interactions.

## 12. Deployment

`output: 'export'`, `basePath` matching the repository name, `.nojekyll` in the output root. City stacks ship as separate lazily-loaded chunks; keep the repository within GitHub's limits and no single file near the file-size cap. Pipeline validation gates the deploy. Fonts self-hosted. Verify under the production `basePath` with `pnpm preview` before pushing.

## 13. Risks

| Risk | Mitigation |
|---|---|
| **Zero radiance read as darkness.** | Observation count is part of the record, mandatory in schema and UI. The data producer's own instruction, enforced structurally. |
| **Fires or fishing boats read as development.** | Contamination flags computed from monthly-versus-annual divergence; monthly data labelled as unfiltered; both explained on the method page. |
| **Radiance read as prosperity.** | §5 is binding. Metric named for light. No ranking framed as achievement. |
| **Repository bloat from imagery.** | Per-city budget, lazy chunks, downsampled national overview, size asserted in CI. |
| **Fourth-atlas repetition.** | Chart-first with a map, not map-first with a chart. Timeline rather than cycle. `DESIGN.md` §2. |
| **DMSP spliced in for a longer series.** | Excluded in v1; intercalibration is a project of its own. |
