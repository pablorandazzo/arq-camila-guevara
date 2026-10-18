# Architecture portfolio prototype

Static Astro site with Sveltia CMS. The current Spanish copy, Studio RHE branding, imagery, address and article links are **local prototype material**, not verified information about Camila Guevara. Do not publish or represent these assets as yours without replacing the content and confirming the necessary rights (including the logo and fonts).

## Local setup

Requires Node.js 22.22+ (or newer). Run `npm install`, then `npm run dev` and open `http://localhost:4321/`. Run `npm run check` and `npm run build` before deploying; `dist/` is the static output. `npm run preview` serves that output locally. The original binary assets remain under `assets/` and are served at their original `/assets/...` URLs in development and copied into `dist/assets/` during build. Do not add Git LFS for CMS media.

## Editing content

- `src/content/projects/*.json`: one project per file, rendered at `/projects/<filename>/`. Category is `resorts` or `commercial`. The numeric `order` controls the listing.
- `src/content/articles/*.json`: one article per file, rendered at `/journal/<filename>/`. `categories` controls filters; `originalSlug` adds an optional original-site link. The original prototype only had three article summaries and six project descriptions; entries without those fields intentionally show no invented body copy.
- `src/content/site.json`: home, studio, contact and privacy copy, images and navigation labels. Featured IDs must match existing filenames exactly; the build fails on a missing featured entry.
- Cover images and gallery items need meaningful `alt` text. Use `/assets/images/<filename>` for existing or uploaded media. The CMS limits new image uploads to 3 MB and converts raster uploads to WebP, at most 1800 × 1800. Existing larger prototype files are retained for layout fidelity.

For a visual editor, run the Astro dev server and open `http://localhost:4321/admin/index.html` in Chrome or Edge. To edit local files without remote credentials, choose **Work with Local Repository** and pick this folder. Editing JSON directly also works. Check the page after saving; refresh if needed.

## Connecting GitHub and deploying

The private repository is `pablorandazzo/arq-camila-guevara` on the `main` branch. Sveltia is configured for GitHub **token sign-in**; give editors write access to the repository. To sign in, use the CMS login screen to create a fine-grained token for this repository with **Contents: read and write** (metadata read is automatic), then paste it into the browser prompt. Do not save tokens in this repository. A Git-connected static host should build with `npm install && npm run build` and publish `dist/` on content commits. Host the site at the domain root because links and media use root-relative URLs; verify the host serves generated directory `index.html` pages and `/admin/index.html`. The CMS does not itself deploy the built site.

Legacy `/about.html`, `/projects.html?filter=...`, `/journal.html`, `/contact.html`, `/privacy.html`, `/project.html?id=...` and `/article.html?id=...` are compatibility entries in the static output. Known detail IDs redirect client-side to their static pages; unknown IDs show a missing-entry message, not another entry. JavaScript is required for the old query-string detail URLs. The canonical collection routes are fully static.
