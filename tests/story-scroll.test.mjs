import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const script = (await readFile(new URL('../assets/project-story-interaction.js', import.meta.url), 'utf8'))
  .replace('export function', 'function') + '\ninitProjectStory({ listen: (target, type, handler) => target?.addEventListener(type, handler), progress: null });';

test('project story keeps the right text scrollable and routes edge and rail wheel input to the gallery', () => {
  const events = new Map();
  const on = id => (type, handler) => events.set(`${id}:${type}`, handler);
  const paragraph = {};
  const copy = { scrollHeight: 780, clientHeight: 600, scrollTop: 0, contains: target => target === paragraph };
  const aside = { querySelector: () => copy, addEventListener: on('aside'), classList: { next: false, toggle(name, value) { if (name === 'is-next') this.next = value; } } };
  const rail = { addEventListener: on('rail') };
  const story = { scrollHeight: 4000, clientHeight: 600, scrollTop: 0, offsetTop: 0, addEventListener: on('story'),
    querySelector: selector => selector === '.project-story-next-image' ? { offsetTop: 3400 } : { getBoundingClientRect: () => ({ bottom: 600 }) },
    getBoundingClientRect: () => ({ bottom: 600 }), scrollBy({ top }) { this.scrollTop += top; } };
  const body = { children: [], classList: { menuOpen: false, contains(name) { return name === 'menu-open' && this.menuOpen; }, toggle() {} } };
  const document = { body, documentElement: {}, getElementById: id => id === 'project-story-scroll' ? story : null,
    querySelector: selector => selector === '.project-story-aside' ? aside : selector === '.site-rail' ? rail : null,
    querySelectorAll: () => [], addEventListener() {} };
  let mobile = false;
  let reduced = false;
  const window = { matchMedia: query => ({ get matches() { return query.includes('max-width') ? mobile : reduced; }, addEventListener() {} }), addEventListener() {} };
  const frames = [];
  let nextFrame = 0;
  let time = 0;
  const advance = () => frames.shift().callback(++time * 16.67);
  const settle = () => {
    let count = 0;
    while (frames.length && count++ < 100) advance();
    assert.ok(count < 100, 'animated scrolling always settles');
  };
  runInNewContext(script, { document, window, location: { search: '' },
    requestAnimationFrame: callback => { const id = ++nextFrame; frames.push({ id, callback }); return id; },
    cancelAnimationFrame: id => { const index = frames.findIndex(frame => frame.id === id); if (index >= 0) frames.splice(index, 1); } });
  events.get('story:scroll')();
  events.get('story:scroll')();
  assert.equal(frames.length, 1, 'rapid scroll events share a layout update');
  advance();

  const wheel = (target, deltaY, deltaMode = 0) => ({ target, deltaY, deltaMode, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } });
  const inside = wheel(paragraph, 120);
  events.get('aside:wheel')(inside);
  assert.equal(inside.defaultPrevented, false, 'the right column retains native wheel scrolling');
  assert.equal(story.scrollTop, 0);

  copy.scrollTop = 180;
  const atEnd = wheel(paragraph, 120);
  events.get('aside:wheel')(atEnd);
  assert.equal(atEnd.defaultPrevented, true);
  assert.equal(story.scrollTop, 0, 'the gallery starts an animation instead of jumping');
  advance();
  assert.ok(story.scrollTop > 0 && story.scrollTop < 120, 'images move progressively with the wheel');
  settle();
  assert.equal(story.scrollTop, 120, 'the gallery reaches the requested position');

  const onRail = wheel(rail, 90);
  events.get('rail:wheel')(onRail);
  assert.equal(onRail.defaultPrevented, true);
  settle();
  assert.equal(story.scrollTop, 210);

  const lineWheel = wheel(rail, 3, 1);
  events.get('rail:wheel')(lineWheel);
  settle();
  assert.equal(story.scrollTop, 258, 'line-based mouse wheel movement uses pixel-equivalent distance');

  const pageWheel = wheel(rail, 1, 2);
  events.get('rail:wheel')(pageWheel);
  settle();
  assert.equal(story.scrollTop, 858, 'page-based wheel movement covers one gallery viewport');
  story.scrollTop = 3000;
  events.get('story:scroll')();
  advance();
  assert.equal(aside.classList.next, true, 'next project appears near the end without per-frame geometry reads');

  events.get('story:wheel')(wheel(story, 200));
  advance();
  assert.ok(frames.length, 'the gallery has a pending animation frame');
  events.get('story:pointerdown')();
  assert.equal(frames.length, 0, 'touch or scrollbar interaction cancels wheel inertia');

  reduced = true;
  const beforeReduced = story.scrollTop;
  events.get('rail:wheel')(wheel(rail, 90));
  assert.equal(story.scrollTop, beforeReduced + 90, 'reduced motion retains immediate scrolling');
  assert.equal(frames.length, 0);
  reduced = false;
  mobile = true;
  const touchWheel = wheel(story, 90);
  events.get('story:wheel')(touchWheel);
  assert.equal(touchWheel.defaultPrevented, false, 'mobile keeps native scrolling');
  mobile = false;

  body.classList.menuOpen = true;
  const withMenu = wheel(rail, 90);
  events.get('rail:wheel')(withMenu);
  assert.equal(withMenu.defaultPrevented, false, 'the open menu owns its wheel input');
});
