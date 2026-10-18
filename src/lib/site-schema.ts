import { z } from 'astro/zod';
import { imagePath, imageSection, textSection, quoteSection } from './sections';

const basic = [imageSection, textSection, quoteSection] as const;
const homeSection = z.discriminatedUnion('type', [
  ...basic,
  z.object({ type: z.literal('home_hero'), image: imagePath, alt: z.string().min(1), intro: z.string(), title: z.string().min(1) }),
  z.object({ type: z.literal('home_intro'), label: z.string(), image: imagePath, alt: z.string().min(1), title: z.string(), text: z.string(), linkLabel: z.string(), linkHref: z.string().startsWith('/'), projectLinkLabel: z.string(), featuredProjects: z.array(z.string()).min(1).max(3) }),
  z.object({ type: z.literal('home_services'), label: z.string(), text: z.string(), image: imagePath, alt: z.string().min(1), focusPrefix: z.string(), commercialLabel: z.string(), conjunction: z.string(), resortsLabel: z.string(), linkLabel: z.string(), linkHref: z.string().startsWith('/') }),
  z.object({ type: z.literal('home_journal'), title: z.string(), text: z.string(), linkLabel: z.string(), linkHref: z.string().startsWith('/'), articleLinkLabel: z.string(), featuredArticles: z.array(z.string()).min(1).max(3) }),
]);
const aboutSection = z.discriminatedUnion('type', [
  ...basic,
  z.object({ type: z.literal('split_hero'), image: imagePath, alt: z.string().min(1), title: z.string().min(1) }),
  z.object({ type: z.literal('statement'), label: z.string(), text: z.string() }),
  z.object({ type: z.literal('feature'), label: z.string(), title: z.string(), text: z.string(), image: imagePath, alt: z.string().min(1), imageSide: z.enum(['left', 'right']), linkLabel: z.string().optional(), linkHref: z.string().startsWith('/').optional() }),
  z.object({ type: z.literal('call_to_action'), text: z.string(), linkLabel: z.string(), linkHref: z.string().startsWith('/') }),
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
  brand: z.string(), established: z.string(), menu: z.array(z.string()).length(4),
  privacyLabel: z.string(), creditLabel: z.string(), creditUrl: z.url(),
  home: z.object({ meta: z.string(), sections: z.array(homeSection).min(1) }),
  about: z.object({ meta: z.string(), sections: z.array(aboutSection).min(1) }),
  contact: z.object({ meta: z.string(), sections: z.array(contactSection).min(1) }),
  privacy: z.object({ sections: z.array(privacySection).min(1) }),
});

export type SiteSection = z.infer<typeof homeSection> | z.infer<typeof aboutSection> | z.infer<typeof contactSection> | z.infer<typeof privacySection>;
