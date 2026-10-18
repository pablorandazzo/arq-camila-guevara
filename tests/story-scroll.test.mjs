import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const script = await readFile(new URL('../assets/interaction.js', import.meta.url), 'utf8');

test('project story keeps the right text scrollable and routes edge and rail wheel input to the gallery', () => {
  const events = new Map();
  const on = id => (type, handler) => events.set(`${id}:${type}`, handler);
  const paragraph = {};
  const copy = { scrollHeight: 780, clientHeight: 600, scrollTop: 0, contains: target => target === paragraph };
  const aside = { querySelector: () => copy, addEventListener: on('aside'), classList: { toggle() {} } };
  const rail = { addEventListener: on('rail') };
  const story = { scrollHeight: 4000, clientHeight: 600, scrollTop: 0, addEventListener: on('story'),
    querySelector: selector => selector === '.project-story-next-image' ? { getBoundingClientRect: () => ({ top: 4000 }) } : { getBoundingClientRect: () => ({ bottom: 600 }) },
    getBoundingClientRect: () => ({ bottom: 600 }), scrollBy({ top }) { this.scrollTop += top; } };
  const body = { children: [], classList: { menuOpen: false, contains(name) { return name === 'menu-open' && this.menuOpen; }, toggle() {} } };
  const document = { body, documentElement: {}, getElementById: id => id === 'project-story-scroll' ? story : null,
    querySelector: selector => selector === '.project-story-aside' ? aside : selector === '.site-rail' ? rail : null,
    querySelectorAll: () => [], addEventListener() {} };
  const window = { matchMedia: () => ({ matches: false, addEventListener() {} }), addEventListener() {} };
  runInNewContext(script, { document, window, location: { search: '' } });

  const wheel = (target, deltaY) => ({ target, deltaY, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } });
  const inside = wheel(paragraph, 120);
  events.get('aside:wheel')(inside);
  assert.equal(inside.defaultPrevented, false, 'the right column retains native wheel scrolling');
  assert.equal(story.scrollTop, 0);

  copy.scrollTop = 180;
  const atEnd = wheel(paragraph, 120);
  events.get('aside:wheel')(atEnd);
  assert.equal(atEnd.defaultPrevented, true);
  assert.equal(story.scrollTop, 120, 'the gallery takes over at the end of the text');

  const onRail = wheel(rail, 90);
  events.get('rail:wheel')(onRail);
  assert.equal(onRail.defaultPrevented, true);
  assert.equal(story.scrollTop, 210);

  body.classList.menuOpen = true;
  const withMenu = wheel(rail, 90);
  events.get('rail:wheel')(withMenu);
  assert.equal(withMenu.defaultPrevented, false, 'the open menu owns its wheel input');
});
