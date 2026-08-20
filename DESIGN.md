# DESIGN — Cahaya Malam

Authoritative for every visual decision in this repository. `PRD.md` says what the product is; this says what it looks like and why. When code and this document disagree, this document is right.

---

## 1. The house layer

These projects should read as siblings — recognisably from the same hand — without looking like one template recoloured. **What is shared is rhythm and rigour; what is per-app is identity.**

**Shared across every project:**

```
space    4 8 12 16 24 32 48 64 96 128     4px base
motion   fast 120ms · state 240ms · orchestrated 500–600ms · ease cubic-bezier(0.2,0,0,1)
edge     hairline 0.5px · radius 2px only
```

- **One orchestrated moment per app.** Everything else is state change.
- **The legend contract.** Every view states what it is showing, from when, and what it cannot show.
- **The citation line.** Small, monospace, always present where a claim is made.
- **Type floor 16px.** Tabular figures on anything that updates.
- **Zero runtime network. Offline after first load. Self-hosted fonts.**
- **Reduced motion gets a complete alternative**, never a degraded one.
- **No component library.**

**Per-app:** colour, typeface, layout, and the instrument.

## 2. This app's identity — chart-first, not map-first

The sibling atlases are map-first with a control. **This one is inverted: the time series is the hero and the map is the reference.**

That is not a stylistic variation, it follows from the subject. Lightning and currents are *cycles* — they want a dial and a canvas. This is a *trend* over fourteen years, and a trend wants a timeline, a line, and an axis you can read values off.

Dark ground, because the subject is night. But the brightest thing on screen is a line, not a field.

## 3. The signature: the confidence band

**Directly beneath the radiance line, on the same time axis, sits the cloud-free observation count.**

Not in a tooltip. Not on a separate tab. Not as an annotation. **A band under the line, sharing the x-axis, always visible.**

This is the design carrying the product's central obligation. The data producer's own instruction is that a zero must never be read as darkness, and Indonesia is the worst case for it. Confidence and value are read in one glance or the design has failed.

**Sparse months visibly thin the radiance line** — reduced stroke weight and opacity where the observation count falls below the adequacy threshold — so a low-confidence spike does not look like a finding.

## 4. Colour

### Ground

```
--night     #0C1014    deep blue-black
--panel     #141A20    cards, chart ground
--rule      #212A32    hairlines, axes
```

Not pure black. Night imagery against pure black loses its low end.

### Radiance — single hue, luminance-monotonic

```
--r1  #1A2E42     --r2  #2F5F7E     --r3  #5A97AE
--r4  #9FCBD6     --r5  #F2F6EF     peak
```

Single-hue and monotonic for the same reason as any continuous field: hue is categorical, radiance is continuous, and a rainbow ramp would invent boundaries. Brightness encoding brightness is also the honest choice — the image looks like what it measures.

### The semantic three

```
--line        #E8C15A     the radiance line — warm, the value
--confidence  #4E6B7A     the observation band — cool, recessive, never competing
--nodata      #3A3F44     zero observations — grey, and NOT the same as dark
```

**`--nodata` is the most important colour in the product.** A month with no usable observations must be visually distinct from a month observed and found dark. Grey hatch, not black fill, and labelled. Conflating them is the failure this whole design exists to prevent.

### Contamination

```
--flag  #C2703A     fire or boat contamination likely
```

A marker on the timeline and a tint on the affected frames. Used nowhere else.

### Not in the palette

**No red.** Nothing here is an error, and red on a regional comparison would read as judgement.
**No green-to-red ranking ramp.** The change table measures light, not merit. `PRD.md` §5.
**No rainbow radiance.**

## 5. Type

```
Space Grotesk     display, headings, city names — distinctive numerals for the readouts
Inter             body, controls, labels
IBM Plex Mono     radiance values, observation counts, dates, citations
```

Self-hosted via `next/font`.

```
14  16  18  22  28  36  46          1.25 ratio
```

**Dark-mode weight correction:** body 300–400, headings 500 maximum, 0.01em tracking below 16px.

Tabular figures on every value — the readouts update continuously during playback and must not jitter.

## 6. Layout

**Three levels, each with a different shape.**

**Overview.** The national annual composite as a browse map, cities marked, with a search field. Deliberately plain — this is a doorway, not a destination.

**City view.** The main screen. Image stack occupying the upper left, radiance line and confidence band spanning the full width beneath, city metadata and readouts in a right column. **The image and the chart share a scrubber**, so moving through time moves both.

**Compare.** Two to four radiance lines on one axis, each city's confidence band stacked directly beneath its own line. Never a shared band — confidence is per city per month and merging them would hide exactly the case that matters.

**Mobile:** image stack at 40vh, chart beneath at full width, readouts collapsing under that. Compare limited to two cities.

## 7. Motion

**The orchestrated moment is playback** — the image stack advancing month by month while the scrubber, the radiance readout, and the confidence band's current position move together. About twenty seconds for a full fourteen-year series, which is slow enough to watch a place change.

Everything else is state change: selecting a city, adding a comparison, changing the year range.

```
--dur-fast     120ms
--dur-state    240ms
--dur-frame    280ms     per month during playback
```

**Reduced motion:** playback does not autostart, the scrubber remains fully usable, and the small-multiples grid is offered as the complete alternative — every month visible at once, which conveys the same change without animation.

## 8. Legend — the honesty contract

Never optional. It always states:

1. **Dataset version and whether the active layer is monthly (unfiltered) or annual (temporal lights removed).**
2. **What the observation band means**, in one sentence.
3. **That no-data and dark are different**, with both swatches shown.
4. Composite period and EOG citation.

Point 3 is the one that matters most, and it is why both swatches appear in the legend rather than only in the chart.

## 9. Accessibility

- **Every chart has a table equivalent** — month, radiance, observation count, adequacy flag. Always present, not a fallback, and it is what someone would paste into a message.
- **Colour is never the only channel.** No-data carries a hatch pattern as well as its grey; contamination carries a marker glyph as well as its tint; sparse months carry reduced stroke weight as well as opacity.
- Scrubber and city selector keyboard-operable; focus visible at 3px.
- Type floor 16px; AA contrast on `--night` for all readouts.
- Reduced motion has a complete path via small multiples. §7.

## 10. What not to do

- **No radiance value rendered without its observation count.** Ever.
- **No treating zero observations as darkness** — separate colour, separate pattern, separate label.
- No red anywhere; no ranking ramp on the change table.
- No rainbow radiance scale.
- No development, prosperity, or growth language in any label, axis title, or tooltip.
- No shared confidence band across compared cities.
- No autoplay under reduced motion.
- No light mode.
- No component library.
