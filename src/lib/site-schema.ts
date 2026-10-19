import { z } from 'astro/zod';
import { imagePath, imageSection, textSection, quoteSection } from './sections';

const basic = [imageSection, textSection, quoteSection] as const;
const homeSection = z.discriminatedUnion('type', [
  ...basic,
  z.object({ type: z.literal('home_hero'), image: imagePath, alt: z.string().min(1), title: z.string().min(1) }),
  z.object({ type: z.literal('home_about'), label: z.string().min(1), image: imagePath, alt: z.string().min(1), title: z.string().min(1), text: z.string().min(1) }),
  z.object({ type: z.literal('home_projects'), featuredProjects: z.array(z.string().min(1)).min(1), projectLinkLabel: z.string().min(1) }),
]);
const contactSection = z.discriminatedUnion('type', [
  ...basic,
  z.object({ type: z.literal('contact_details'), heading: z.string(), qualification: z.string().min(1), statement: z.string(), cta: z.string(), detailsLabel: z.string(), email: z.email(), phoneDisplay: z.string(), phoneHref: z.string(), linkedin: z.url(), image: imagePath, imageAlt: z.string().min(1) }),
]);
function requireOne<T extends { type: string }>(type: string, kind = 'sección') {
  return (sections: T[], ctx: z.RefinementCtx) => {
    if (sections.filter(section => section.type === type).length !== 1) {
      ctx.addIssue({ code: 'custom', message: `Se requiere exactamente una ${kind} ${type}.` });
    }
  };
}

export const siteSchema = z.object({
  brand: z.string(), menu: z.array(z.object({ id: z.enum(['home', 'cv', 'projects', 'contact']), label: z.string().min(1) })).length(4)
    .superRefine((items, ctx) => {
      const destinations = items.map(item => ({ type: item.id }));
      for (const id of ['home', 'cv', 'projects', 'contact']) requireOne(id, 'opción de menú')(destinations, ctx);
    }),
  cv: z.string().regex(/^\/cv\/[a-zA-Z0-9_.-]+\.pdf$/i).optional().nullable(),
  creditLabel: z.string(), creditUrl: z.url(),
  home: z.object({ meta: z.string(), sections: z.array(homeSection).min(1)
    .superRefine((sections, ctx) => {
      for (const type of ['home_hero', 'home_about', 'home_projects']) requireOne(type)(sections, ctx);
    }) }),

  profile: z.object({ meta: z.string().min(1), skills: z.array(z.object({ label: z.string().min(1), tools: z.array(z.string().min(1)).min(1) })).min(1), languages: z.array(z.string().min(1)).min(1) }),
  contact: z.object({ meta: z.string(), sections: z.array(contactSection).min(1).superRefine(requireOne('contact_details')) }),
});

export type SiteSection = z.infer<typeof homeSection> | z.infer<typeof contactSection>;
