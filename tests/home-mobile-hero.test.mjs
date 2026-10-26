import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { z } from 'astro/zod';
import { parse } from 'yaml';

async function loadTs(path, imports) {
  const source = await readFile(new URL(path, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } });
  const module = { exports: {} };
  runInNewContext(outputText, { module, exports: module.exports, require: name => {
    assert.ok(name in imports, `Unexpected import: ${name}`);
    return imports[name];
  } });
  return module.exports;
}
const sections = await loadTs('../src/lib/sections.ts', { 'astro/zod': { z } });
const { siteSchema } = await loadTs('../src/lib/site-schema.ts', { 'astro/zod': { z }, './sections': sections });
const site = JSON.parse(await readFile(new URL('../src/content/site.json', import.meta.url), 'utf8'));

test('the CMS offers an optional mobile image for the homepage hero', async () => {
  const config = parse(await readFile(new URL('../public/admin/config.yml', import.meta.url), 'utf8'));
  const hero = config.collections.find(c => c.name === 'pages').files.find(f => f.name === 'site').fields
    .find(f => f.name === 'home').fields.find(f => f.name === 'sections').types.find(t => t.name === 'home_hero');
  const mobile = hero.fields.find(f => f.name === 'mobileImage');
  assert.equal(mobile?.widget, 'image');
  assert.equal(mobile?.required, false);
});

test('the site schema preserves a mobile hero upload and accepts an unset field', () => {
  for (const value of ['/assets/images/mobile-photo.webp', '', null, undefined]) {
    const input = structuredClone(site);
    const hero = input.home.sections.find(s => s.type === 'home_hero');
    hero.mobileImage = value;
    const parsed = siteSchema.parse(input).home.sections.find(s => s.type === 'home_hero');
    assert.equal(parsed.mobileImage, value);
  }
  const invalid = structuredClone(site);
  invalid.home.sections.find(s => s.type === 'home_hero').mobileImage = 'https://example.com/photo.jpg';
  assert.equal(siteSchema.safeParse(invalid).success, false);
});

test('mobile hero source prefers the complete uploaded photo, with legacy fallback', async () => {
  const manifest = {
    '/assets/images/desktop.jpg': { width: 1800, height: 1200, sources: [{ src: '/desktop.webp', width: 1800 }], mobileHero: { src: '/crop.avif', width: 390, height: 844 } },
    '/assets/images/mobile.webp': { width: 800, height: 1200, sources: [{ src: '/mobile-640.webp', width: 640 }, { src: '/mobile-800.webp', width: 800 }] },
    '/assets/images/plain.svg': { width: 100, height: 100, sources: [{ src: '/plain.svg', width: 100 }] },
  };
  const { homeHeroMobileProps } = await loadTs('../src/lib/images.ts', { './image-manifest.json': { default: manifest } });
  assert.equal(typeof homeHeroMobileProps, 'function');
  const custom = homeHeroMobileProps('/assets/images/desktop.jpg', '/assets/images/mobile.webp');
  assert.equal(custom.srcset, '/mobile-640.webp 640w, /mobile-800.webp 800w');
  assert.equal(custom.width, 800);
  assert.equal(custom.height, 1200);
  assert.equal(custom.type, undefined);
  assert.equal(custom.sizes, '100vw');
  for (const empty of [undefined, null, '']) {
    const fallback = homeHeroMobileProps('/assets/images/desktop.jpg', empty);
    assert.equal(fallback.srcset, '/crop.avif');
    assert.equal(fallback.type, 'image/avif');
  }
  assert.equal(homeHeroMobileProps('/assets/images/plain.svg'), null);
});
