import { defineConfig } from 'astro/config';
import { cp, copyFile, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const legacyPages = { projects: '/projects/', contact: '/contact/', privacy: '/privacy/' };
const entryIds = async (kind) => (await readdir(resolve('src/content', kind)))
  .filter(name => /^[a-z0-9-]+\.json$/.test(name)).map(name => name.slice(0, -5));
const legacyHtml = (name, ids = []) => {
  const target = legacyPages[name];
  const script = target
    ? `location.replace(${JSON.stringify(target)} + location.search);`
    : `const id = new URLSearchParams(location.search).get('id'); const ids = ${JSON.stringify(ids)}; if (id && ids.includes(id)) location.replace('/projects/' + encodeURIComponent(id) + '/');`;
  const back = name === 'project' || name === 'projects' ? '/projects/' : '/';
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${name} — Portfolio Camila Guevara</title><script>${script}</script></head><body><main><h1>${target ? 'Redirigiendo…' : 'Proyecto no encontrado'}</h1><a href="${target || back}">Volver</a></main></body></html>`;
};

// Keep the prototype's original binary assets in place; serve them at their old URLs.
function prototypeAssets() {
  return {
    name: 'prototype-assets',
    hooks: {
      'astro:server:setup': ({ server }) => {
        server.middlewares.use(async (req, res, next) => {
          const name = /^\/(projects|contact|privacy|project)\.html$/.exec((req.url || '').split('?')[0])?.[1];
          if (!name) return next();
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.end(legacyHtml(name, name === 'project' ? await entryIds('projects') : []));
        });
        server.middlewares.use('/assets', async (req, res, next) => {
          // Vite's public middleware cannot serve files outside publicDir.
          const { createReadStream } = await import('node:fs');
          const { stat } = await import('node:fs/promises');
          const pathname = decodeURIComponent((req.url || '/').split('?')[0]);
          const file = resolve('assets', `.${pathname}`);
          if (!file.startsWith(resolve('assets') + '\\') && !file.startsWith(resolve('assets') + '/')) return next();
          try {
            if (!(await stat(file)).isFile()) return next();
            const ext = file.split('.').pop()?.toLowerCase();
            res.setHeader('Content-Type', ({ jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', svg: 'image/svg+xml', webp: 'image/webp', woff2: 'font/woff2', css: 'text/css', js: 'text/javascript' })[ext] || 'application/octet-stream');
            if (/^\/images\/optimized\/[^/]+-[a-f0-9]{10}-\d+\.webp$/.test(pathname) || /^\/fonts\/[^/]+\.[a-f0-9]{7}\.woff2$/.test(pathname)) {
              res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
            }
            createReadStream(file).pipe(res);
          } catch { next(); }
        });
      },
      'astro:build:done': async ({ dir }) => {
        const output = new URL(dir);
        // Keep originals available at the media URLs Sveltia stores in content.
        await cp(resolve('assets'), new URL('assets/', output), { recursive: true, filter: (path) => !path.endsWith('site.js') });
        await copyFile(resolve('favicon.ico'), new URL('favicon.ico', output));
        for (const name of [...Object.keys(legacyPages), 'project']) {
          const ids = name === 'project' ? await entryIds('projects') : [];
          await writeFile(new URL(`${name}.html`, output), legacyHtml(name, ids));
        }
      },
    },
  };
}

export default defineConfig({
  integrations: [prototypeAssets()],
  vite: {
    // Allow the temporary Cloudflare Quick Tunnel host for this preview.
    server: { allowedHosts: ['referrals-pediatric-disks-increases.trycloudflare.com'] },
  },
});
