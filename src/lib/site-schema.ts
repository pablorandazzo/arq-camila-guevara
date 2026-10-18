import { z } from 'astro/zod';
import { imagePath, imageSection, textSection, quoteSection } from './sections';

const basic = [imageSection, textSection, quoteSection] as const;
const homeSection = z.discriminatedUnion('type', [
  ...basic,
  z.object({ type: z.literal('home_hero'), image: imagePath, alt: z.string().min(1), intro: z.string(), title: z.string().min(1) }),
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

export const siteSchema = z.object({
  brand: z.string(), menu: z.array(z.string()).length(2),
  privacyLabel: z.string(), creditLabel: z.string(), creditUrl: z.url(),
  home: z.object({ meta: z.string(), sections: z.array(homeSection).min(1) }),

  contact: z.object({ meta: z.string(), sections: z.array(contactSection).min(1) }),
  privacy: z.object({ sections: z.array(privacySection).min(1) }),
});

export type SiteSection = z.infer<typeof homeSection> | z.infer<typeof contactSection> | z.infer<typeof privacySection>;
