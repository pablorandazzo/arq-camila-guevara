import { z } from 'astro/zod';

export const imagePath = z.string().regex(/^\/assets\/images\/[a-zA-Z0-9_.-]+\.(jpg|jpeg|png|webp|svg)$/i);
export const imageSection = z.object({ type: z.literal('image'), image: imagePath, alt: z.string().min(1) });
export const textSection = z.object({ type: z.literal('text'), heading: z.string().min(1), body: z.string().min(1) });
export const quoteSection = z.object({ type: z.literal('quote'), quote: z.string().min(1), attribution: z.string().optional() });
export const contentSections = z.array(z.discriminatedUnion('type', [imageSection, textSection, quoteSection])).default([]);
