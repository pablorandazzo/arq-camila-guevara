import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const css = (await readFile(new URL('../assets/site.css', import.meta.url), 'utf8')).replace(/\/\*[\s\S]*?\*\//g, '');

for (const selector of ['.project-story-copy>div>p', '.project-story-mobile-copy>p:not(.project-story-location)']) {
  test(`${selector} preserves CMS line breaks without disabling text wrapping`, () => {
    const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)];
    const matchingRules = rules.filter(([, selectors]) => selectors.split(',').some(value => value.trim() === selector));
    assert.ok(matchingRules.some(([, , declarations]) => /white-space\s*:\s*pre-line\s*(;|$)/.test(declarations)), 'project descriptions must preserve newlines on desktop and mobile');
  });
}
