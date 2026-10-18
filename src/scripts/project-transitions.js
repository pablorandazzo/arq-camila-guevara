import { navigate } from 'astro:transitions/client';

const projectPath = /^\/projects\/[a-z0-9-]+\/?$/i;
const warmedRoutes = new Map();
let navigationPending = false;

function warmProject(url) {
  const key = url.href;
  if (warmedRoutes.has(key)) return warmedRoutes.get(key);

  const preparation = fetch(key, { credentials: 'same-origin' })
    .then((response) => {
      if (!response.ok) throw new Error(`Project prefetch failed: ${response.status}`);
      return response.text();
    })
    .then(async (html) => {
      const page = new DOMParser().parseFromString(html, 'text/html');
      const hero = page.querySelector('.project-story-hero img');
      if (!hero?.getAttribute('src')) throw new Error('Project hero image is missing');

      const image = new Image();
      image.decoding = 'async';
      image.fetchPriority = 'high';
      image.src = new URL(hero.getAttribute('src'), url).href;
      await image.decode().catch(() => undefined);
    })
    .catch(() => undefined);

  warmedRoutes.set(key, preparation);
  return preparation;
}

function projectUrlFrom(anchor) {
  if (!(anchor instanceof HTMLAnchorElement)) return null;
  const url = new URL(anchor.href, window.location.href);
  if (url.origin !== window.location.origin || !projectPath.test(url.pathname) || ['/projects/commercial/', '/projects/resorts/'].includes(url.pathname)) return null;
  return url;
}

function warmFromEvent(event) {
  const anchor = event.target.closest?.('a[href]');
  const url = projectUrlFrom(anchor);
  if (url && url.pathname !== window.location.pathname) void warmProject(url);
}

document.addEventListener('pointerover', warmFromEvent, { passive: true });
document.addEventListener('focusin', warmFromEvent);
document.addEventListener('pointerdown', warmFromEvent, { passive: true });
document.addEventListener('click', async (event) => {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const anchor = event.target.closest?.('a[href]');
  if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return;
  const url = projectUrlFrom(anchor);
  if (!url || url.pathname === window.location.pathname || navigationPending) return;

  event.preventDefault();
  navigationPending = true;
  document.documentElement.dataset.projectNavigating = 'true';

  try {
    const prepared = warmProject(url);
    await Promise.race([prepared, new Promise((resolve) => window.setTimeout(resolve, 700))]);
    await navigate(url.href);
  } catch {
    window.location.assign(url.href);
  } finally {
    navigationPending = false;
    delete document.documentElement.dataset.projectNavigating;
  }
}, { capture: true });

document.addEventListener('astro:before-swap', (event) => {
  const incoming = event.newDocument;
  if (!incoming?.body?.classList.contains('home-page')) return;

  let introPlayed = false;
  try { introPlayed = sessionStorage.getItem('rhe-entry-played') === '1'; } catch {}
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!introPlayed && !reducedMotion) return;

  incoming.body.classList.add('home-entry-skip');
  incoming.documentElement.dataset.homeEntryPlayed = 'true';
  incoming.documentElement.dataset.skipHomeTransition = 'true';
  incoming.querySelector('#entry-mask')?.remove();
});

document.addEventListener('astro:page-load', () => {
  navigationPending = false;
  delete document.documentElement.dataset.projectNavigating;
  for (const route of warmedRoutes.keys()) {
    if (route !== window.location.href) warmedRoutes.delete(route);
  }
});
