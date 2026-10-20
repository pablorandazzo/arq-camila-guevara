import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { imagePath, contentSections } from './lib/sections';

const projects = defineCollection({
  loader: glob({ base: './src/content/projects', pattern: '*.json' }),
  schema: z.object({ title: z.string(), image: imagePath, alt: z.string().min(1), category: z.string().min(1), location: z.string().optional(), description: z.string().optional(), language: z.enum(['es', 'en']).default('es'), sections: contentSections, order: z.number().int() }),
});
const categories = defineCollection({
  loader: glob({ base: './src/content/categories', pattern: '*.json' }),
  schema: z.object({ slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), label: z.string().min(1), order: z.number().int(), showInFilters: z.boolean().default(true) }),
});
export const collections = { projects, categories };
