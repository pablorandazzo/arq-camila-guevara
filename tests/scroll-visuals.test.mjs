import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const script = (await readFile(new URL('../assets/scroll-visuals.js', import.meta.url), 'utf8'))
  .replace('export function', 'function') + '\ninitScrollVisuals({ listen: (target, type, handler) => target?.addEventListener(type, handler), reducedMotion, signal });';

test('visible images follow vertical and horizontal scroll without overriding native input or reduced motion', () => {
  const events = new Map();
  const frames = [];
  const classes = new Set();
  let top = 550;
  let left = 550;
  let desktop = false;
  let notify;
  const container = { getBoundingClientRect: () => ({ top, bottom: top + 400, left, right: left + 390, width: 390, height: 400 }) };
  const image = {
    style: { translate: '' }, closest: () => container,
    classList: { add: name => classes.add(name), remove: name => classes.delete(name) },
  };
  const scroller = { contains: node => node === container, addEventListener: (type, handler) => events.set(`home:${type}`, handler) };
  const reducedMotion = { matches: false, addEventListener: (type, handler) => events.set(`reduce:${type}`, handler) };
  const desktopMedia = { get matches() { return desktop; }, addEventListener: (type, handler) => events.set(`desktop:${type}`, handler) };
  const window = {
    innerWidth: 1440, innerHeight: 844, IntersectionObserver: class {},
    matchMedia: () => desktopMedia,
    addEventListener: (type, handler) => events.set(`window:${type}`, handler),
  };
  const document = { querySelectorAll: () => [image], getElementById: id => id === 'home-scroll' ? scroller : null };
  const signal = { addEventListener: (_type, handler) => events.set('abort', handler) };
  class IntersectionObserver {
    constructor(callback) { notify = callback; }
    observe() {}
    disconnect() {}
  }
  runInNewContext(script, { document, window, signal, reducedMotion, IntersectionObserver,
    requestAnimationFrame: callback => { frames.push(callback); return frames.length; }, cancelAnimationFrame() {} });

  notify([{ target: container, isIntersecting: true }]);
  frames.shift()();
  const first = image.style.translate;
  top = 150;
  events.get('window:scroll')();
  frames.shift()();
  assert.notEqual(image.style.translate, first, 'image position responds to mobile document scroll');
  assert.ok(classes.has('scroll-visual-image'));

  desktop = true;
  events.get('desktop:change')();
  frames.shift()();
  assert.match(image.style.translate, /px 0$/, 'desktop home follows the horizontal axis');
  left = 300;
  events.get('home:scroll')();
  frames.shift()();

  reducedMotion.matches = true;
  events.get('reduce:change')();
  assert.equal(image.style.translate, '');
  assert.equal(classes.has('scroll-visual-image'), false);
  reducedMotion.matches = false;
  top = 200;
  left = 200;
  events.get('reduce:change')();
  frames.shift()();
  assert.ok(classes.has('scroll-visual-image'), 'visible image resumes when reduced motion is disabled');
  events.get('abort')();
});
