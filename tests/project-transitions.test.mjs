import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('project routes use coordinated client-side transitions and wait for the incoming hero image', async () => {
  const [layout, project, navigation, css, interactions] = await Promise.all([
    read('src/layouts/SiteLayout.astro'),
    read('src/pages/projects/[id].astro'),
    read('src/scripts/project-transitions.js'),
    read('assets/site.css'),
    read('assets/interaction.js'),
  ]);

  assert.match(layout, /<ClientRouter\s*\/>/, 'Astro client router is enabled');
  assert.match(layout, /data-astro-rerun/, 'page interactions are rerun after client navigation');
  assert.match(project, /transition:name="project-page"/, 'project page participates in the native view transition');
  assert.match(project, /decoding="async"/, 'the hero is decoded asynchronously');
  assert.match(navigation, /from ['"]astro:transitions\/client['"]/, 'navigation uses Astro route transitions');
  assert.match(navigation, /\.decode\(\)/, 'destination hero is decoded before navigation');
  assert.match(navigation, /astro:page-load/, 'project navigation state resets after route swaps');
  assert.match(css, /::view-transition-new\(project-page\)/, 'incoming project has a dedicated entrance animation');
  assert.match(css, /::view-transition-old\(project-page\)/, 'outgoing project is animated with the incoming route');
  assert.match(css, /data-astro-transition="back"\]::view-transition-new\(project-page\)/, 'browser history back reverses the incoming project direction');
  assert.match(css, /project-page-in-reverse/, 'back navigation uses its own mirrored keyframe');
  assert.match(css, /prefers-reduced-motion:reduce[\s\S]*?view-transition-new\(project-page\)/, 'native route motion respects reduced-motion');
  assert.match(interactions, /__rheInteractionController/, 'global interaction listeners are cleaned up between route swaps');
});

test('returning home after the first visit skips the intro curtain and hero animations', async () => {
  const [layout, navigation, css] = await Promise.all([
    read('src/layouts/SiteLayout.astro'),
    read('src/scripts/project-transitions.js'),
    read('assets/site.css'),
  ]);

  assert.match(layout, /is:inline[\s\S]*?sessionStorage[\s\S]*?rhe-entry-played/, 'a full document return reads the session flag before styles load');
  assert.match(navigation, /astro:before-swap/, 'the incoming homepage is prepared before it can paint');
  assert.match(navigation, /home-entry-skip/, 'the incoming homepage receives the intro-skip state before the swap');
  assert.match(navigation, /skipHomeTransition/, 'return navigation disables the browser-level page transition as well');
  assert.match(navigation, /entry-mask[^\n]*remove|querySelector\(['"]#entry-mask['"]\)[^\n]*remove/, 'the orange curtain is removed before the returned homepage is swapped in');
  assert.match(css, /home-entry-skip[\s\S]*?animation:none!important/, 'returning home suppresses the entrance animations before first paint');
  assert.match(css, /data-skip-home-transition[\s\S]*?view-transition-new\(root\)[\s\S]*?animation:none!important/, 'returning home does not get the default view-transition fade');
});
