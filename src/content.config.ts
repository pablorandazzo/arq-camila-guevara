import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { imagePath, contentSections } from './lib/sections';

const projects = defineCollection({
  loader: glob({ base: './src/content/projects', pattern: '*.json' }),
  schema: z.object({ title: z.string(), image: imagePath, alt: z.string().min(1), category: z.enum(['resorts', 'commercial']), location: z.string().optional(), type: z.string(), description: z.string().optional(), language: z.enum(['es', 'en']).default('es'), sections: contentSections, order: z.number().int() }),
});
const articles = defineCollection({
  loader: glob({ base: './src/content/articles', pattern: '*.json' }),
  schema: z.object({ title: z.string(), image: imagePath, alt: z.string().min(1), categories: z.array(z.enum(['updates', 'commercial', 'resorts', 'newsletters'])).default([]), summary: z.string().optional(), originalSlug: z.string().optional(), sections: contentSections, order: z.number().int() }),
});
export const collections = { projects, articles };
