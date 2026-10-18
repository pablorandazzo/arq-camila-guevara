import site from '../content/site.json';
import { siteSchema } from './site-schema';
export default siteSchema.parse(site);
