import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const css = (await readFile(new URL('../assets/site.css', import.meta.url), 'utf8')).replace(/\/\*[\s\S]*?\*\//g, '');
const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)];
const declarationsFor = selector => rules.filter(([, selectors]) => selectors.split(',').some(value => value.trim() === selector)).map(([, , declarations]) => declarations).join(';');

test('project detail images use their own ratio at every breakpoint', () => {
  for (const selector of ['.project-story-hero', '.project-story-image', '.project-story-next-image']) {
    assert.doesNotMatch(declarationsFor(selector), /aspect-ratio\s*:\s*4\s*\/\s*3|(?:min-)?height\s*:\s*(?:calc\(|[1-9])/, selector);
  }
  for (const selector of ['.project-story-hero img', '.project-story-image img', '.project-story-next-image img']) {
    const declarations = declarationsFor(selector);
    assert.match(declarations, /height\s*:\s*auto(?:;|$)/, selector);
    assert.doesNotMatch(declarations, /object-fit\s*:\s*cover|height\s*:\s*100%/, selector);
  }
});

test('project hero uses the uncropped responsive source on mobile too', async () => {
  const template = await readFile(new URL('../src/pages/projects/[id].astro', import.meta.url), 'utf8');
  assert.doesNotMatch(template, /mobileHeroSource|<source\b/);
  assert.match(template, /imageProps\(project.data.image, storySizes\)/);
});

test('project detail photos are excluded from the scroll zoom effect', async () => {
  const script = await readFile(new URL('../assets/scroll-visuals.js', import.meta.url), 'utf8');
  const imageSelectors = script.match(/document.querySelectorAll\(\s*'([^']+)'/)?.[1];
  assert.ok(imageSelectors);
  assert.doesNotMatch(imageSelectors, /project-story/);
  assert.match(imageSelectors, /home-about/);
});
