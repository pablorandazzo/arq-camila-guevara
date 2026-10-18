import { z } from 'astro/zod';
import { imagePath, imageSection, textSection, quoteSection } from './sections';

const basic = [imageSection, textSection, quoteSection] as const;
const homeSection = z.discriminatedUnion('type', [
  ...basic,
  z.object({ type: z.literal('home_hero'), image: imagePath, alt: z.string().min(1), title: z.string().min(1) }),
  z.object({ type: z.literal('home_about'), label: z.string().min(1), image: imagePath, alt: z.string().min(1), title: z.string().min(1), text: z.string().min(1) }),
  z.object({ type: z.literal('home_projects'), featuredProjects: z.array(z.string().min(1)).min(1), projectLinkLabel: z.string().min(1) }),
  z.object({ type: z.literal('home_approach'), label: z.string().min(1), title: z.string().min(1), principles: z.array(z.object({ heading: z.string().min(1), text: z.string().min(1) })).length(3), image: imagePath, alt: z.string().min(1) }),
]);
const contactSection = z.discriminatedUnion('type', [
  ...basic,
  z.object({ type: z.literal('contact_details'), heading: z.string(), statement: z.string(), cta: z.string(), detailsLabel: z.string(), address: z.string(), mapUrl: z.url(), email: z.email(), phoneDisplay: z.string(), phoneHref: z.string(), instagram: z.url(), twitter: z.url(), linkedin: z.url(), image: imagePath, imageAlt: z.string().min(1) }),
]);
const privacySection = z.discriminatedUnion('type', [
  ...basic,
  z.object({ type: z.literal('privacy_statement'), heading: z.string(), backLabel: z.string(), text: z.string(), linkText: z.string(), linkUrl: z.url() }),
]);

function requireOne<T extends { type: string }>(type: string) {
  return (sections: T[], ctx: z.RefinementCtx) => {
    if (sections.filter(section => section.type === type).length !== 1) {
      ctx.addIssue({ code: 'custom', message: `Se requiere exactamente una sección ${type}.` });
    }
  };
}

export const siteSchema = z.object({
  brand: z.string(), menu: z.array(z.string()).length(2),
  privacyLabel: z.string(), creditLabel: z.string(), creditUrl: z.url(),
  home: z.object({ meta: z.string(), sections: z.array(homeSection).min(1)
    .superRefine((sections, ctx) => {
      for (const type of ['home_hero', 'home_about', 'home_projects', 'home_approach']) requireOne(type)(sections, ctx);
    }) }),

  contact: z.object({ meta: z.string(), sections: z.array(contactSection).min(1).superRefine(requireOne('contact_details')) }),
  privacy: z.object({ sections: z.array(privacySection).min(1).superRefine(requireOne('privacy_statement')) }),
});

export type SiteSection = z.infer<typeof homeSection> | z.infer<typeof contactSection> | z.infer<typeof privacySection>;
