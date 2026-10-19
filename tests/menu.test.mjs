import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const script = await readFile(new URL('../assets/interaction.js', import.meta.url), 'utf8');
const projectListScript = (await readFile(new URL('../assets/project-list-interaction.js', import.meta.url), 'utf8'))
  .replace('export function', 'function') + '\ninitProjectList({ listen: (target, type, handler) => target?.addEventListener(type, handler), reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)") });';

test('menu locks and restores page scroll, focus, inert state, and homepage input', () => {
  const listeners = new Map();
  const element = (tagName = 'DIV') => ({
    tagName, inert: false, isConnected: true, style: {}, dataset: {}, scrollTop: 0,
    attributes: {},
    classList: {
      values: new Set(),
      contains(name) { return this.values.has(name); },
      toggle(name, active) { if (active) this.values.add(name); else this.values.delete(name); },
      add(name) { this.values.add(name); },
      remove(...names) { names.forEach((name) => this.values.delete(name)); },
    },
    addEventListener(name, handler) { listeners.set(`${this.id}:${name}`, handler); },
    setAttribute(name, value) { this.attributes[name] = value; },
    getAttribute(name) { return this.attributes[name]; },
    focus() { document.activeElement = this; },
    contains() { return false; },
    getClientRects() { return [1]; },
    closest() { return null; },
  });
  const button = element('BUTTON'); button.id = 'button'; button.attributes['aria-expanded'] = 'false';
  const menu = element('ASIDE'); menu.id = 'menu'; menu.clientHeight = 400; menu.scrollHeight = 800;
  menu.scrollBy = ({ top }) => { menu.scrollTop += top; };
  const link = element('A'); link.id = 'link';
  menu.querySelectorAll = () => [link];
  const shade = element(); shade.id = 'shade';
  const main = element('MAIN'); main.id = 'main';
  const scroller = element('MAIN'); scroller.id = 'scroller'; scroller.scrollLeft = 300; scroller.scrollWidth = 2000; scroller.clientWidth = 1000;
  let scrollPosition = 300;
  Object.defineProperty(scroller, 'scrollLeft', {
    get: () => scrollPosition,
    set: (value) => { scrollPosition = Math.round(value); },
  });
  const rail = element('HEADER'); rail.contains = (child) => child === button;
  const body = element('BODY'); body.children = [rail, shade, menu, main];
  const html = element('HTML');
  const nodes = new Map([['.menu-toggle', button], ['#main-menu', menu], ['#menu-shade', shade], ['#home-scroll', scroller]]);
  const document = {
    body, documentElement: html, activeElement: main,
    getElementById: (id) => nodes.get(`#${id}`) || null,
    querySelector: (selector) => nodes.get(selector) || null,
    querySelectorAll: () => [],
    addEventListener: (name, handler) => {
      const handlers = listeners.get(`document:${name}`) || [];
      handlers.push(handler); listeners.set(`document:${name}`, handlers);
    },
  };
  const media = { matches: true, addEventListener(name, handler) { listeners.set(`media:${name}`, handler); } };
  const window = {
    scrollY: 420, matchMedia: (query) => query.includes('reduced-motion') ? { matches: false, addEventListener() {} } : media, addEventListener(name, handler) { const handlers = listeners.get(`window:${name}`) || []; handlers.push(handler); listeners.set(`window:${name}`, handlers); },
    scrollTo(_x, y) { this.scrollY = y; },
  };
  const timers = new Map(); let nextTimer = 0;
  const frames = [];
  let nextFrame = 0;
  runInNewContext(script, { document, window, HTMLElement: Object, location: { search: '' }, requestAnimationFrame: (callback) => { frames.push({ id: ++nextFrame, callback }); return nextFrame; }, cancelAnimationFrame: (id) => { const index = frames.findIndex(frame => frame.id === id); if (index >= 0) frames.splice(index, 1); },
    setTimeout(fn) { timers.set(++nextTimer, fn); return nextTimer; }, clearTimeout(id) { timers.delete(id); } });

  listeners.get('button:click')();
  assert.equal(body.style.top, '-420px');
  assert.equal(body.style.position, 'fixed');
  assert.equal(html.style.overflow, 'hidden');
  assert.equal(main.inert, true);
  assert.equal(menu.inert, false);
  assert.equal(document.activeElement, button);

  const keydown = (key) => {
    const event = { key, target: button, prevented: false, preventDefault() { this.prevented = true; } };
    for (const handler of listeners.get('document:keydown')) handler(event);
    return event;
  };
  assert.equal(keydown('ArrowRight').prevented, false);
  assert.equal(scroller.scrollLeft, 300);
  assert.equal(keydown('End').prevented, true);
  assert.equal(menu.scrollTop, 800);
  const wheel = { prevented: false, preventDefault() { this.prevented = true; } };
  listeners.get('scroller:wheel')(wheel);
  assert.equal(wheel.prevented, true);
  keydown('Escape');
  assert.equal(button.getAttribute('aria-expanded'), 'false');
  assert.equal(menu.inert, true);
  assert.equal(main.inert, true, 'background stays inert while exit is visible');
  assert.equal(body.style.position, 'fixed');
  assert.equal(document.activeElement, button);
  listeners.get('button:click')();
  assert.equal(button.getAttribute('aria-expanded'), 'true', 'rapid reopen interrupts exit');
  for (const timer of timers.values()) timer();
  assert.equal(main.inert, true, 'stale close cannot unlock a reopened menu');
  keydown('Escape');
  listeners.get('menu:transitionend')({ target: menu, propertyName: 'visibility' });

  assert.equal(window.scrollY, 420);
  assert.equal(body.style.position, undefined);
  assert.equal(html.style.overflow, undefined);
  assert.equal(main.inert, false);
  assert.equal(menu.inert, true);
  assert.equal(document.activeElement, main);
  media.matches = false;
  listeners.get('media:change')();
  const mobileWheel = { prevented: false, preventDefault() { this.prevented = true; } };
  listeners.get('scroller:wheel')(mobileWheel);
  assert.equal(mobileWheel.prevented, false, 'desktop wheel handler yields to native mobile scrolling');
  assert.equal(keydown('PageDown').prevented, false, 'desktop keyboard handler yields on mobile');
  media.matches = true;
  listeners.get('media:change')();
  scroller.scrollLeft = 550;
  listeners.get('scroller:scroll')();
  const nativeWheel = { deltaX: 0, deltaY: 100, prevented: false, preventDefault() { this.prevented = true; } };
  listeners.get('scroller:wheel')(nativeWheel);
  assert.equal(nativeWheel.prevented, true);
  let ticks = 0;
  while (frames.length && ticks < 100) {
    frames.shift().callback(++ticks * 16.67);
  }
  assert.ok(ticks < 100, 'the animation stops even when the browser rounds subpixel scroll positions');
  assert.equal(scroller.scrollLeft, 650, 'wheel animation reaches its target from the native scroll position');
  listeners.get('scroller:wheel')({ deltaX: 0, deltaY: 3, deltaMode: 1, preventDefault() {} });
  while (frames.length && ticks < 200) frames.shift().callback(++ticks * 16.67);
  assert.ok(ticks < 200);
  assert.equal(scroller.scrollLeft, 698, 'line-based mouse wheels move by a readable distance');
  listeners.get('button:click')();
  listeners.get('window:pageshow').forEach(handler => handler({ persisted: true }));
  assert.equal(main.inert, false, 'bfcache return releases background');
  assert.equal(menu.inert, true);
  assert.equal(button.getAttribute('aria-expanded'), 'false');
});

test('project hover leaves the stack alone; click selects the matching image and link even on rapid changes', () => {
  const handlers = new Map();
  const classes = () => ({ values: new Set(), toggle(name, active) { if (active) this.values.add(name); else this.values.delete(name); } });
  const choice = (index) => ({ dataset: { index: String(index), category: 'resorts' }, attributes: {},
    classList: classes(), closest: () => ({ hidden: false }), setAttribute(key, value) { this.attributes[key] = value; },
    addEventListener(type, handler) { handlers.set(`${index}:${type}`, handler); } });
  const choices = [0, 1, 2].map(choice);
  const links = [0, 1, 2].map(index => ({ href: `/projects/${index}/`, tabIndex: index ? -1 : 0,
    imageAlt: `Alt ${index}`, attributes: index ? { 'aria-hidden': 'true' } : {},
    querySelector: () => ({ src: `/image-${index}.jpg`, complete: true, naturalWidth: 100, dataset: {} }),
    setAttribute(key, value) { this.attributes[key] = value; }, removeAttribute(key) { delete this.attributes[key]; } }));
  const stack = { style: {}, clientHeight: 600, parentElement: { style: {} }, querySelectorAll: () => links };
  const document = {
    body: { children: [], classList: { contains: () => false } },
    documentElement: {}, querySelector: () => null,
    getElementById: (id) => id === 'project-image-stack' ? stack : null,
    querySelectorAll: (selector) => selector === '.project-choice' ? choices : [],
    addEventListener() {},
  };
  const window = { matchMedia: () => ({ matches: false, addEventListener() {} }), addEventListener(type, handler) { handlers.set(`window:${type}`, handler); } };
  let visualOffset = 0;
  const frames = [];
  runInNewContext(projectListScript, { document, window, location: { search: '' }, URLSearchParams,
    getComputedStyle: () => ({ transform: `matrix(1, 0, 0, 1, 0, ${visualOffset})` }),
    requestAnimationFrame(fn) { frames.push(fn); return frames.length; }, cancelAnimationFrame() {} });
  assert.equal(handlers.has('1:mouseenter'), false);
  assert.equal(handlers.has('1:focus'), false);
  assert.equal(stack.style.transform, undefined);
  handlers.get('1:click')();
  assert.equal(stack.style.transform, 'translate3d(0, -100%, 0)');
  assert.equal(links[0].tabIndex, 0, 'visible image stays active at the start of travel');
  visualOffset = -370;
  frames.shift()();
  assert.equal(links[1].tabIndex, 0, 'highlight follows the image in view');
  assert.equal(links[1].imageAlt, 'Alt 1');
  assert.equal(links[1].href, '/projects/1/');
  assert.equal(links[0].attributes['aria-hidden'], 'true');
  assert.equal(choices[1].attributes['aria-pressed'], 'true');
  handlers.get('2:click')();
  assert.equal(stack.style.transform, 'translate3d(0, -200%, 0)');
  visualOffset = -1200;
  frames.shift()();
  assert.equal(links[1].tabIndex, -1);
  assert.equal(links[2].attributes['aria-hidden'], undefined);
  assert.equal(choices[2].classList.values.has('is-active'), true);
  assert.equal(choices[1].classList.values.has('is-active'), false);
  stack.clientHeight = 400;
  assert.equal(stack.style.transform, 'translate3d(0, -200%, 0)', 'percentage travel adapts to viewport changes');
});

test('project preview waits for decoding, ignores stale selections and retains the previous image on failure', async () => {
  const handlers = new Map();
  const choices = [0, 1, 2].map(index => ({ dataset: { index: String(index) }, attributes: {},
    classList: { toggle() {} }, closest: () => ({ hidden: false }),
    setAttribute(name, value) { this.attributes[name] = value; },
    addEventListener(type, handler) { handlers.set(`${index}:${type}`, handler); } }));
  const pending = [];
  const images = [0, 1, 2].map(index => ({ src: index === 0 ? '/image-0.jpg' : undefined, dataset: index ? { src: `/image-${index}.jpg` } : {},
    complete: index === 0, naturalWidth: index === 0 ? 100 : 0,
    decode() { return new Promise((resolve, reject) => pending[index] = { resolve, reject }); } }));
  const links = images.map((image, index) => ({ tabIndex: index ? -1 : 0,
    attributes: index ? { 'aria-hidden': 'true' } : {}, querySelector: () => image,
    setAttribute(name, value) { this.attributes[name] = value; },
    removeAttribute(name) { delete this.attributes[name]; } }));
  const stack = { style: {}, clientHeight: 500, parentElement: { style: {} }, querySelectorAll: () => links };
  const document = { body: { children: [], classList: { contains: () => false } }, documentElement: {},
    querySelector: () => null, querySelectorAll: selector => selector === '.project-choice' ? choices : [],
    getElementById: id => id === 'project-image-stack' ? stack : null, addEventListener() {} };
  const window = { matchMedia: query => ({ matches: query.includes('min-width: 769px'), addEventListener() {} }), addEventListener() {} };
  const frames = [];
  runInNewContext(projectListScript, { document, window, location: { search: '' }, URLSearchParams,
    requestAnimationFrame(fn) { frames.push(fn); return frames.length; }, cancelAnimationFrame() {},
    getComputedStyle: () => ({ transform: 'matrix(1, 0, 0, 1, 0, -1000)' }) });

  const first = handlers.get('1:click')();
  assert.equal(images[1].src, '/image-1.jpg');
  assert.equal(images[2].src, undefined, 'unselected previews do not download before selection');
  assert.equal(stack.style.transform, undefined, 'preview stays visible until decode');
  const second = handlers.get('2:click')();
  images[1].naturalWidth = 100;
  pending[1].resolve();
  await first;
  assert.equal(stack.style.transform, undefined, 'stale decode never commits');
  pending[2].reject(new Error('broken image'));
  await second;
  assert.equal(links[0].tabIndex, 0, 'failed load preserves original detail link');
  assert.equal(choices[0].attributes['aria-pressed'], undefined);
  const retry = handlers.get('2:click')();
  images[2].naturalWidth = 100;
  pending[2].resolve();
  await retry;
  assert.equal(stack.style.transform, 'translate3d(0, -200%, 0)');
  assert.equal(stack.parentElement.style.backgroundImage, 'url("/image-0.jpg")', 'the previous image covers unloaded intermediate frames');
  assert.equal(links[0].tabIndex, 0, 'detail link follows visible image until it moves');
  frames.shift()();
  assert.equal(links[2].tabIndex, 0);
  assert.equal(choices[2].attributes['aria-pressed'], 'true');
});
