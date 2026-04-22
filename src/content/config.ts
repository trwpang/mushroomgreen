import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const FAMILIES = [
  'Weaver',
  'Billingham',
  'Hancox',
  'Dimmock',
  'Griffiths',
  'Nicklin',
  'Pearson',
  'Sidaway',
  'Kendrick',
  'Homer',
  'Other',
] as const;

const households = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/households' }),
  schema: z.object({
    number: z.number().int().min(1).max(59),
    household_name: z.string().min(1),
    family: z.enum(FAMILIES),
    founder: z.boolean().default(false),
    estimated_position: z.boolean().default(false),
    occupants_1861: z.number().int().min(0),
    position: z.object({
      lat: z.number(),
      lon: z.number(),
    }),
    polygon: z.array(z.tuple([z.number(), z.number()])).min(3),
    neighbours: z.array(z.number().int()).optional(),
    related_households: z.array(z.number().int()).optional(),
    photos: z.array(z.string()).optional(),
    sources: z.array(z.string()).optional(),
  }),
});

export const collections = { households };
