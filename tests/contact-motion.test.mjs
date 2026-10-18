import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const script = await readFile(new URL('../assets/interaction.js', import.meta.url), 'utf8');

test('contact keeps background inert through exit, restores scroll and focus, and interrupts a closing panel', () => {
  const events = new Map();
  const on = (id) => (type, handler) => events.set(`${id}:${type}`, handler);
  const content = { tagName: 'MAIN', inert: false, contains: () => false };
  const opener = { addEventListener: on('opener'), focus() { active = this; } };
  const close = { addEventListener: on('close'), focus() { active = this; } };
  const panel = { addEventListener: on('panel') };
  const backdrop = {};
  const classes = new Set();
  const dialog = { tagName: 'DIV', inert: true, contains: () => false, classList: {
    contains: name => classes.has(name), add: name => classes.add(name), remove: name => classes.delete(name),
  }, querySelector: selector => selector === '.dialog-close' ? close : selector === '.dialog-backdrop' ? backdrop : panel,
  querySelectorAll: () => [close], addEventListener: on('dialog') };
  const body = { children: [content, dialog], style: {}, classList: {
    values: new Set(), add(name) { this.values.add(name); }, remove(name) { this.values.delete(name); },
  } };
  const document = { body, documentElement: {}, querySelector: selector => ({
    '.contact-dialog': dialog, '[data-open-contact]': opener,
  })[selector] || null, querySelectorAll: () => [], getElementById: () => null, addEventListener: on('document') };
  let active;
  let reduced = false;
  let mobile = false;
  let reducedChange;
  const window = { scrollY: 250, matchMedia: query => query.includes('reduced-motion')
    ? { get matches() { return reduced; }, addEventListener(_type, handler) { reducedChange = handler; } }
    : { get matches() { return mobile; }, addEventListener() {} },
    addEventListener: on('window'), scrollTo(_x, y) { this.scrollY = y; } };
  let timer;
  const frames = [];
  runInNewContext(script, { document, window, location: { search: '' },
    requestAnimationFrame(fn) { frames.push(fn); },
    setTimeout(fn) { timer = fn; return 1; }, clearTimeout() { timer = null; } });
  events.get('opener:click')();
  frames.shift()();
  assert.equal(content.inert, true);
  assert.equal(dialog.inert, false);
  assert.equal(body.style.top, '-250px');
  assert.equal(active, close);
  events.get('close:click')();
  assert.equal(content.inert, true, 'exit remains modal until its panel finishes');
  events.get('opener:click')();
  assert.equal(dialog.classList.contains('is-open'), true);
  assert.equal(timer, null, 'reopening cancels the old exit timer');
  events.get('close:click')();
  events.get('dialog:transitionend')({ target: backdrop, propertyName: 'opacity' });
  assert.equal(content.inert, true, 'desktop waits for the panel rather than the backdrop');
  events.get('dialog:transitionend')({ target: panel, propertyName: 'transform' });
  assert.equal(content.inert, false);
  assert.equal(dialog.inert, true);
  assert.equal(body.style.top, undefined);
  assert.equal(window.scrollY, 250);
  assert.equal(active, opener);
  mobile = true;
  events.get('opener:click')();
  events.get('close:click')();
  events.get('dialog:transitionend')({ target: backdrop, propertyName: 'opacity' });
  assert.equal(content.inert, true, 'mobile waits for the sliding panel, not the backdrop');
  events.get('dialog:transitionend')({ target: panel, propertyName: 'transform' });
  assert.equal(content.inert, false);
  events.get('opener:click')();
  events.get('close:click')();
  reduced = true;
  reducedChange();
  assert.equal(dialog.inert, true, 'changing motion preference ends an in-flight exit');
  events.get('opener:click')();
  events.get('close:click')();
  assert.equal(dialog.inert, true, 'reduced motion closes without waiting for a transition');
});
