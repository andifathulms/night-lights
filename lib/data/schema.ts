import { z } from 'zod'

/**
 * Zod schemas for everything the pipeline emits. Validation runs in the
 * build gate (`pnpm data:validate`), so a series that fails these never
 * reaches a page.
 *
 * The monthly record schema is a discriminated union for the same reason the
 * TypeScript type is: `no-data` has no radiance field, so there is no shape a
 * radiance value can take without a positive observation count beside it.
 */

export const monthKey = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'month must be YYYY-MM')

export const adequacySchema = z.enum(['adequate', 'sparse'])

export const monthlyRecordSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('no-data'),
    month: monthKey,
    observations: z.literal(0),
  }),
  z.object({
    type: z.literal('observed'),
    month: monthKey,
    observations: z.number().int().positive(),
    meanRadiance: z.number().nonnegative().finite(),
    litRatio: z.number().min(0).max(1),
    adequacy: adequacySchema,
  }),
])

export const annualRecordSchema = z.object({
  year: z.number().int().min(2012).max(2100),
  meanRadiance: z.number().nonnegative().finite(),
  litRatio: z.number().min(0).max(1),
  observations: z.number().int().nonnegative(),
})

export const contaminationFlagSchema = z.object({
  month: monthKey,
  reason: z.enum(['fire-divergence', 'offshore-divergence']),
  ratio: z.number().positive().finite(),
})

export const citySeriesSchema = z.object({
  cityId: z.string().min(1),
  months: z.array(monthlyRecordSchema).min(1),
  years: z.array(annualRecordSchema).min(1),
  flags: z.array(contaminationFlagSchema),
})

export const cityWindowSchema = z.object({
  west: z.number(),
  south: z.number(),
  east: z.number(),
  north: z.number(),
  widthPx: z.number().int().positive(),
  heightPx: z.number().int().positive(),
})

export const citySchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/, 'city ids appear in URLs and share cards'),
  name: z.string().min(1),
  province: z.string().min(1),
  coastal: z.boolean(),
  fireBelt: z.boolean(),
  window: cityWindowSchema,
  note: z.object({ id: z.string().min(1), en: z.string().min(1) }).optional(),
})

export const atlasGeometrySchema = z.object({
  tileWidth: z.number().int().positive(),
  tileHeight: z.number().int().positive(),
  columns: z.number().int().positive(),
  tiles: z.number().int().positive(),
})

export const stackEntrySchema = z.object({
  cityId: z.string().min(1),
  months: z.array(monthKey).min(1),
  geometry: atlasGeometrySchema,
  radiancePath: z.string().min(1),
  observationsPath: z.string().min(1),
  bytes: z.number().int().positive(),
})

/**
 * Provenance is mandatory and is rendered. A build made from stand-in data
 * says so on every page it touches; the alternative is a site that looks
 * like a measurement and is not one.
 */
export const provenanceSchema = z.object({
  kind: z.enum(['eog', 'synthetic']),
  /** EOG product version, e.g. `VNL v1 monthly` / `VNL v2.1 annual`. */
  monthlyProduct: z.string().min(1),
  annualProduct: z.string().min(1),
  /** Set for `synthetic`: what the stand-in is and what it is not. */
  caveat: z.string().optional(),
})

export const citationSchema = z.object({
  label: z.string().min(1),
  text: z.string().min(1),
  url: z.string().url().optional(),
})

export const manifestSchema = z.object({
  version: z.number().int().positive(),
  provenance: provenanceSchema,
  generatedFromSourceVersion: z.string().min(1),
  months: z.array(monthKey).min(1),
  years: z.array(z.number().int()).min(1),
  cities: z.array(citySchema).min(1),
  stacks: z.array(stackEntrySchema).min(1),
  overview: z.object({
    years: z.array(z.number().int()).min(1),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    bounds: cityWindowSchema.omit({ widthPx: true, heightPx: true }),
    path: z.string().min(1),
  }),
  scales: z.object({
    radiance: z.object({
      kind: z.literal('sqrt'),
      maxRadiance: z.number().positive(),
      codes: z.literal(255),
    }),
    observations: z.object({
      kind: z.literal('linear'),
      maxObservations: z.number().positive(),
      codes: z.literal(255),
    }),
  }),
  adequacy: z.object({ minObservations: z.number().int().positive() }),
  citations: z.array(citationSchema).min(1),
})

export type Manifest = z.infer<typeof manifestSchema>
export type StackEntry = z.infer<typeof stackEntrySchema>
export type Provenance = z.infer<typeof provenanceSchema>
export type Citation = z.infer<typeof citationSchema>
