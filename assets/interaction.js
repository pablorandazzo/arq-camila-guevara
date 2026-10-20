(() => {
  const previousController = window.__rheInteractionController;
  previousController?.abort();
  const controller = typeof AbortController === 'function'
    ? new AbortController()
    : { signal: undefined, abort() {} };
  window.__rheInteractionController = controller;
  const listen = (target, type, handler, options = {}) => target?.addEventListener(type, handler, { ...options, signal: controller.signal });
  const menuButton = document.querySelector('.menu-toggle');
  const menu = document.getElementById('main-menu');
  const shade = document.getElementById('menu-shade');
  const background = [...document.body.children].filter((element) =>
    element !== menu && element !== shade && !element.contains(menuButton) && element.tagName !== 'SCRIPT');
  const previousInert = new Map();
  let scrollLock;
  let focusBeforeMenu;
  let pauseHomeScroll = () => {};
  let closeTimer;
  const finishMenuClose = () => {
    if (!menu?.classList.contains('is-closing')) return;
    clearTimeout(closeTimer);
    menu.classList.remove('is-closing');
    background.forEach((element) => { element.inert = previousInert.get(element) ?? false; });
    previousInert.clear();
    document.body.classList.remove('menu-open');
    document.body.style.position = scrollLock.position;
    document.body.style.top = scrollLock.top;
    document.body.style.width = scrollLock.width;
    document.documentElement.style.overflow = scrollLock.overflow;
    const scrollBehavior = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = 'auto';
    window.scrollTo(0, scrollLock.y);
    document.documentElement.style.scrollBehavior = scrollBehavior;
    (focusBeforeMenu?.isConnected && !focusBeforeMenu.inert ? focusBeforeMenu : menuButton).focus({ preventScroll: true });
    scrollLock = undefined;
  };
  const setMenu = (open) => {
    if (!menuButton || !menu || !shade) return;
    if ((menuButton.getAttribute('aria-expanded') === 'true') === open) return;
    if (open) {
      document.body.classList.remove('header-hidden');
      clearTimeout(closeTimer);
      const reopening = menu.classList.contains('is-closing');
      menu.classList.remove('is-closing');
      if (!reopening) focusBeforeMenu = document.activeElement;
      pauseHomeScroll();
      if (!scrollLock) {
        scrollLock = { y: window.scrollY, position: document.body.style.position, top: document.body.style.top, width: document.body.style.width, overflow: document.documentElement.style.overflow };
        document.documentElement.style.overflow = 'hidden';
        document.body.style.position = 'fixed';
        document.body.style.top = `-${scrollLock.y}px`;
        document.body.style.width = '100%';
        background.forEach((element) => { previousInert.set(element, element.inert); element.inert = true; });
      }
    } else {
      menu.classList.add('is-closing');
    }
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    menu.inert = !open;
    menu.classList.toggle('is-open', open);
    shade.classList.toggle('is-open', open);
    document.body.classList.add('menu-open');
    if (open) menuButton.focus();
    else {
      menuButton.focus({ preventScroll: true });
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) finishMenuClose();
      else closeTimer = setTimeout(finishMenuClose, 1450);
    }
  };
  menu?.addEventListener('transitionend', (event) => {
    if (event.target === menu && event.propertyName === 'visibility') finishMenuClose();
  });
  listen(window, 'pageshow', (event) => {
    if (!event.persisted || !menuButton || !menu || !shade) return;
    clearTimeout(closeTimer);
    if (scrollLock) {
      menu.classList.add('is-closing');
      finishMenuClose();
    }
    menu.classList.remove('is-open', 'is-closing');
    shade.classList.remove('is-open');
    menu.inert = true;
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', 'Abrir menú');
    document.body.classList.remove('menu-open');
  });
  menuButton?.addEventListener('click', () => setMenu(menuButton.getAttribute('aria-expanded') !== 'true'));
  shade?.addEventListener('click', () => setMenu(false));
  listen(menu, 'click', (event) => {
    const link = event.target.closest?.('a[href]');
    if (!link || link.target === '_blank' || menuButton?.getAttribute('aria-expanded') !== 'true') return;
    // Let the route fetch start with the old menu already gone instead of freezing its overlay.
    setMenu(false);
    finishMenuClose();
  });
  listen(document, 'keydown', (event) => {
    if (menuButton?.getAttribute('aria-expanded') !== 'true') return;
    if (event.key === 'Escape') { setMenu(false); return; }
    if (!event.target.closest?.('#main-menu') && ['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(event.key)) {
      event.preventDefault();
      if (event.key === 'Home') menu.scrollTop = 0;
      else if (event.key === 'End') menu.scrollTop = menu.scrollHeight;
      else menu.scrollBy({ top: (event.key === 'ArrowUp' || event.key === 'PageUp' ? -1 : 1) * (event.key.startsWith('Arrow') ? 80 : menu.clientHeight * .8), behavior: 'instant' });
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = [menuButton, ...menu.querySelectorAll('a')].filter((element) => element.getClientRects().length);
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (event.shiftKey && (document.activeElement === first || !focusable.includes(document.activeElement))) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && (document.activeElement === last || !focusable.includes(document.activeElement))) {
      event.preventDefault(); first.focus();
    }
  });

  const scroller = document.getElementById('home-scroll');
  const progress = document.getElementById('scroll-progress');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const headerLogo = document.querySelector('.logo');
  const contrastAt = (x, y, ignoredSelector) => {
    const layers = document.elementsFromPoint(x, y).filter((element) => !element.closest(ignoredSelector));
    let fallbackLight = true;
    let hasPhoto = false;
    for (const element of layers) {
      if (element.tagName === 'IMG' || element.closest('img')) { hasPhoto = true; continue; }
      let node = element;
      while (node && node !== document.documentElement) {
        const style = getComputedStyle(node);
        if (style.backgroundImage !== 'none') { hasPhoto = true; break; }
        const match = style.backgroundColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
        if (match && Number(match[4] ?? 1) > 0) {
          const linear = (value) => { value /= 255; return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4; };
          const luminance = .2126 * linear(Number(match[1])) + .7152 * linear(Number(match[2])) + .0722 * linear(Number(match[3]));
          if (node === document.body || node === document.documentElement) fallbackLight = luminance > .179;
          else if (Number(match[4] ?? 1) > .98) return luminance > .179;
        }
        node = node.parentElement;
      }
    }
    return hasPhoto ? false : fallbackLight;
  };
  const homeHero = document.querySelector('.home-hero');
  const homeDesktop = window.matchMedia('(min-width: 769px)');
  const headerStoryScroller = document.getElementById('project-story-scroll');
  const headerPosition = () => homeDesktop.matches && scroller
    ? scroller.scrollLeft
    : headerStoryScroller && homeDesktop.matches ? headerStoryScroller.scrollTop : window.scrollY;
  let lastHeaderPosition = headerPosition();
  let headerVisibilityFrame = 0;
  const updateHeaderVisibility = () => {
    headerVisibilityFrame = 0;
    const position = headerPosition();
    const delta = position - lastHeaderPosition;
    lastHeaderPosition = position;
    if (homeDesktop.matches) {
      document.body.classList.remove('header-hidden');
      return;
    }
    if (document.body.classList.contains('menu-open')) {
      document.body.classList.remove('header-hidden');
      return;
    }
    if (position <= 8 || delta < -3) document.body.classList.remove('header-hidden');
    else if (delta > 3) document.body.classList.add('header-hidden');
  };
  const scheduleHeaderVisibility = () => {
    if (!headerVisibilityFrame) headerVisibilityFrame = requestAnimationFrame(updateHeaderVisibility);
  };
  listen(window, 'scroll', scheduleHeaderVisibility, { passive: true });
  listen(scroller, 'scroll', scheduleHeaderVisibility, { passive: true });
  listen(headerStoryScroller, 'scroll', scheduleHeaderVisibility, { passive: true });
  listen(homeDesktop, 'change', () => {
    lastHeaderPosition = headerPosition();
    document.body.classList.remove('header-hidden');
  });
  listen(document, 'astro:page-load', () => {
    lastHeaderPosition = headerPosition();
    document.body.classList.remove('header-hidden');
  });
  if (headerLogo) {
    let contrastFrame = 0;
    const updateHeaderContrast = () => {
      contrastFrame = 0;
      if (homeHero && document.body.classList.contains('home-page')) {
        const heroRect = homeHero.getBoundingClientRect();
        const headerBandHeight = parseFloat(getComputedStyle(document.body, '::before').height) || 84;
        const homeHeroVisible = homeDesktop.matches ? heroRect.right > 0 : heroRect.bottom > headerBandHeight;
        document.body.classList.toggle('header-over-hero', homeHeroVisible);
      } else {
        document.body.classList.remove('header-over-hero');
      }
      const logoRect = headerLogo.getBoundingClientRect();
      const logoLight = contrastAt(logoRect.left + Math.min(logoRect.width / 2, 60), logoRect.top + logoRect.height / 2, '.logo, .site-rail, .main-menu, .menu-shade, .entry-mask, .contact-dialog');
      document.body.classList.toggle('header-logo-on-light', logoLight);
      document.body.classList.toggle('header-logo-on-dark', !logoLight);
      const isMobile = !homeDesktop.matches;
      const toggle = document.querySelector('.menu-toggle');
      if (isMobile && toggle) {
        const rect = toggle.getBoundingClientRect();
        const toggleLight = contrastAt(rect.left + rect.width / 2, rect.top + rect.height / 2, '.menu-toggle, .site-rail, .main-menu, .menu-shade, .entry-mask, .contact-dialog');
        document.body.classList.toggle('header-toggle-on-light', toggleLight);
        document.body.classList.toggle('header-toggle-on-dark', !toggleLight);
      } else {
        document.body.classList.remove('header-toggle-on-light', 'header-toggle-on-dark');
      }
    };
    const scheduleHeaderContrast = () => {
      if (!contrastFrame) contrastFrame = requestAnimationFrame(updateHeaderContrast);
    };
    listen(window, 'scroll', scheduleHeaderContrast, { passive: true });
    listen(window, 'resize', scheduleHeaderContrast, { passive: true });
    listen(scroller, 'scroll', scheduleHeaderContrast, { passive: true });
    listen(document, 'astro:page-load', scheduleHeaderContrast);
    scheduleHeaderContrast();
  }
  listen(reducedMotion, 'change', () => { if (reducedMotion.matches) finishMenuClose(); });
  // Mobile hero photography trails the document while the copy follows native scroll.
  const mobile = window.matchMedia('(max-width: 768px)');
  const parallaxImage = document.querySelector('.home-hero picture img, .split-hero .hero-visual img');
  if (parallaxImage) {
    let frame = 0;
    let visible = true;
    const updateParallax = () => {
      frame = 0;
      if (!visible) return;
      const active = mobile.matches && !reducedMotion.matches;
      const transform = active ? `translate3d(0, ${Math.min(window.scrollY * .15, 170)}px, 0) scale(1.45)` : '';
      if (parallaxImage.style.transform !== transform) parallaxImage.style.transform = transform;
      parallaxImage.classList.toggle('is-parallax-active', active);
    };
    const queueParallax = () => { if (visible && !frame) frame = requestAnimationFrame(updateParallax); };
    const parallaxSection = parallaxImage.closest('.home-hero, .split-hero');
    const observer = parallaxSection && 'IntersectionObserver' in window
      ? new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        if (visible) queueParallax();
        else {
          if (frame) cancelAnimationFrame(frame);
          frame = 0;
          parallaxImage.classList.remove('is-parallax-active');
        }
      }, { rootMargin: '100px 0px' }) : null;
    observer?.observe(parallaxSection);
    listen(window, 'scroll', queueParallax, { passive: true });
    listen(mobile, 'change', updateParallax);
    listen(reducedMotion, 'change', updateParallax);
    controller.signal?.addEventListener('abort', () => {
      observer?.disconnect();
      if (frame) cancelAnimationFrame(frame);
    }, { once: true });
    updateParallax();
  }
  const heroTitle = document.querySelector('.home-hero .hero-title');
  if (heroTitle && !reducedMotion.matches && !heroTitle.dataset.split) {
    const titleText = heroTitle.textContent;
    const titleLines = Array.from(heroTitle.children).filter(line => line.classList.contains('hero-title-line'));
    let characterIndex = 0;
    const characterSpans = (text) => Array.from(text, (character) => {
      const span = document.createElement('span');
      span.className = 'hero-character';
      span.setAttribute('aria-hidden', 'true');
      span.style.setProperty('--char-index', characterIndex++);
      span.textContent = character === ' ' ? '\u00a0' : character;
      return span;
    });
    heroTitle.dataset.split = 'true';
    heroTitle.setAttribute('aria-label', titleText);
    if (titleLines.length) {
      titleLines.forEach(line => line.replaceChildren(...characterSpans(line.textContent)));
    } else {
      heroTitle.replaceChildren(...characterSpans(titleText));
    }
  }
  const entryMask = document.getElementById('entry-mask');
  if (entryMask) {
    let entryPlayed = false;
    try { entryPlayed = sessionStorage.getItem('rhe-entry-played') === '1'; } catch {}
    if (reducedMotion.matches || entryPlayed) {
      entryMask.remove();
      document.body.classList.add('is-entering');
    } else {
      try { sessionStorage.setItem('rhe-entry-played', '1'); } catch {}
      window.setTimeout(() => {
        const heroImage = document.querySelector('.home-hero picture img');
        const imageDecoded = heroImage?.decode ? heroImage.decode().catch(() => {}) : Promise.resolve();
        const imageFallback = new Promise((resolve) => window.setTimeout(resolve, 600));
        Promise.race([imageDecoded, imageFallback]).then(() => {
          if (!entryMask.isConnected) return;
          document.body.classList.add('is-entering');
          entryMask.classList.add('is-leaving');
          window.setTimeout(() => entryMask.remove(), 1400);
        });
      }, 150);
    }
  }
  const motionScales = [...document.querySelectorAll('.intro-top img, .project-strip img, .article-card img, .split-hero .hero-visual img, .about-section>img, .project-story-hero img, .project-story-image img, .article-detail>img, .content-section--image img')].filter((image) => !image.closest('[data-project-story]'));
  const scaleObservers = [];
  if (reducedMotion.matches) motionScales.forEach((image) => image.classList.add('is-scroll-revealed'));
  else if ('IntersectionObserver' in window) {
    const scaleGroups = new Map();
    motionScales.forEach((image) => {
      const root = scroller && image.closest('#home-scroll') ? scroller : null;
      if (!scaleGroups.has(root)) scaleGroups.set(root, []);
      scaleGroups.get(root).push(image);
      image.classList.add('is-scroll-reveal-pending');
    });
    scaleGroups.forEach((images, root) => {
      const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-scroll-revealed');
        observer.unobserve(entry.target);
      }), { root, threshold: .08 });
      images.forEach((image) => observer.observe(image));
      scaleObservers.push(observer);
    });
  } else motionScales.forEach((image) => image.classList.add('is-scroll-revealed'));
  listen(reducedMotion, 'change', () => {
    if (!reducedMotion.matches) return;
    scaleObservers.forEach((observer) => observer.disconnect());
    motionScales.forEach((image) => image.classList.add('is-scroll-revealed'));
  });

  if (scroller) {
    const desktop = window.matchMedia('(min-width: 769px)');
    let target = scroller.scrollLeft;
    let raf = 0;
    let lastTick = 0;
    const maxScroll = () => scroller.scrollWidth - scroller.clientWidth;
    const tick = (time) => {
      const distance = target - scroller.scrollLeft;
      const elapsed = lastTick ? Math.min(50, (time ?? lastTick + 16.67) - lastTick) : 16.67;
      lastTick = time ?? lastTick + 16.67;
      const step = distance * (1 - Math.pow(.86, elapsed / 16.67));
      // Scroll positions may be rounded to whole pixels: never schedule frames that cannot move them.
      if (Math.abs(distance) <= 1 || Math.abs(step) < 1) {
        scroller.scrollLeft = target;
        raf = 0;
        lastTick = 0;
        return;
      }
      scroller.scrollLeft += step;
      raf = requestAnimationFrame(tick);
    };
    const move = (delta) => {
      target = Math.max(0, Math.min(maxScroll(), target + delta));
      if (reducedMotion.matches) { scroller.scrollLeft = target; return; }
      if (!raf) raf = requestAnimationFrame(tick);
    };
    pauseHomeScroll = () => { if (raf) cancelAnimationFrame(raf); raf = 0; lastTick = 0; target = scroller.scrollLeft; };
    let progressFrame = 0;
    const updateProgress = () => {
      progressFrame = 0;
      const range = document.documentElement.scrollHeight - window.innerHeight;
      const value = String(Math.round((desktop.matches ? scroller.scrollLeft / (maxScroll() || 1) : window.scrollY / (range || 1)) * 100));
      if (progress && progress.textContent !== value) progress.textContent = value;
    };
    const scheduleProgress = () => { if (!progressFrame) progressFrame = requestAnimationFrame(updateProgress); };
    listen(desktop, 'change', () => { pauseHomeScroll(); updateProgress(); });
    listen(reducedMotion, 'change', () => {
      pauseHomeScroll();
      if (reducedMotion.matches) finishMenuClose();
    });
    listen(scroller, 'wheel', (event) => {
      if (!desktop.matches) return;
      if (document.body.classList.contains('menu-open')) { event.preventDefault(); return; }
      event.preventDefault();
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? scroller.clientWidth : 1;
      move((Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY) * unit);
    }, { passive: false });
    listen(scroller, 'scroll', () => {
      // Native touch, scrollbar and programmatic scrolling must become the next wheel origin.
      if (!raf) target = scroller.scrollLeft;
      scheduleProgress();
    }, { passive: true });
    listen(window, 'scroll', scheduleProgress, { passive: true });
    controller.signal?.addEventListener('abort', () => {
      pauseHomeScroll();
      if (progressFrame) cancelAnimationFrame(progressFrame);
    }, { once: true });
    listen(document, 'keydown', (event) => {
      if (!desktop.matches) return;
      if (document.body.classList.contains('menu-open')) return;
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (event.target instanceof HTMLElement && (event.target.isContentEditable || event.target.closest('input, textarea, select, button, a, [contenteditable]'))) return;
      if (['ArrowRight', 'ArrowDown', 'PageDown', ' '].includes(event.key)) { event.preventDefault(); move(scroller.clientWidth * .7); }
      if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(event.key)) { event.preventDefault(); move(-scroller.clientWidth * .7); }
      if (event.key === 'Home') { event.preventDefault(); move(-maxScroll()); }
      if (event.key === 'End') { event.preventDefault(); move(maxScroll()); }
    });
    updateProgress();
  }
  if (progress && !scroller) {
    let progressFrame = 0;
    const updateProgress = () => {
      progressFrame = 0;
      const range = document.documentElement.scrollHeight - window.innerHeight;
      const value = String(Math.round(window.scrollY / (range || 1) * 100));
      if (progress.textContent !== value) progress.textContent = value;
    };
    listen(window, 'scroll', () => {
      if (!progressFrame) progressFrame = requestAnimationFrame(updateProgress);
    }, { passive: true });
    controller.signal?.addEventListener('abort', () => {
      if (progressFrame) cancelAnimationFrame(progressFrame);
    }, { once: true });
    updateProgress();
  }

  if (document.getElementById('project-story-scroll')) {
    import('/assets/project-story-interaction.js').then(({ initProjectStory }) => {
      if (!controller.signal?.aborted) initProjectStory({ listen, progress, signal: controller.signal });
    });
  }
  if (document.getElementById('project-image-stack')) {
    import('/assets/project-list-interaction.js').then(({ initProjectList }) => {
      if (!controller.signal?.aborted) initProjectList({ listen, signal: controller.signal });
    });
  }

  if (document.querySelector('.home-about>img, .home-featured-projects .card-image img, .projects-mobile-list .card-image img, .project-story-hero img, .contact-image-frame img')) {
    import('/assets/scroll-visuals.js').then(({ initScrollVisuals }) => {
      if (!controller.signal?.aborted) initScrollVisuals({ listen, reducedMotion, signal: controller.signal });
    });
  }

  if (document.querySelector('.contact-dialog')) {
    import('/assets/contact-interaction.js').then(({ initContact }) => initContact(controller.signal));
  }
})();
