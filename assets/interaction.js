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
  const parallaxImage = document.querySelector('.home-hero > img, .split-hero .hero-visual img');
  if (parallaxImage) {
    let frame = 0;
    const updateParallax = () => {
      frame = 0;
      parallaxImage.style.transform = mobile.matches && !reducedMotion.matches
        ? `translate3d(0, ${Math.min(window.scrollY * .15, 170)}px, 0) scale(1.45)` : '';
    };
    const queueParallax = () => { if (!frame) frame = requestAnimationFrame(updateParallax); };
    listen(window, 'scroll', queueParallax, { passive: true });
    listen(mobile, 'change', updateParallax);
    listen(reducedMotion, 'change', updateParallax);
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
        const heroImage = document.querySelector('.home-hero>img');
        const imageDecoded = heroImage?.decode ? heroImage.decode().catch(() => {}) : Promise.resolve();
        const imageFallback = new Promise((resolve) => window.setTimeout(resolve, 1800));
        Promise.race([imageDecoded, imageFallback]).then(() => {
          if (!entryMask.isConnected) return;
          document.body.classList.add('is-entering');
          entryMask.classList.add('is-leaving');
          window.setTimeout(() => entryMask.remove(), 2700);
        });
      }, 500);
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
    let target = 0;
    let raf = 0;
    const maxScroll = () => scroller.scrollWidth - scroller.clientWidth;
    const tick = () => {
      const distance = target - scroller.scrollLeft;
      scroller.scrollLeft += distance * .14;
      if (Math.abs(distance) > .35) raf = requestAnimationFrame(tick);
      else { scroller.scrollLeft = target; raf = 0; }
    };
    const move = (delta) => {
      target = Math.max(0, Math.min(maxScroll(), target + delta));
      if (reducedMotion.matches) { scroller.scrollLeft = target; return; }
      if (!raf) raf = requestAnimationFrame(tick);
    };
    pauseHomeScroll = () => { if (raf) cancelAnimationFrame(raf); raf = 0; target = scroller.scrollLeft; };
    const updateProgress = () => {
      const range = document.documentElement.scrollHeight - window.innerHeight;
      const value = String(Math.round((desktop.matches ? scroller.scrollLeft / (maxScroll() || 1) : window.scrollY / (range || 1)) * 100));
      if (progress && progress.textContent !== value) progress.textContent = value;
    };
    listen(desktop, 'change', () => { pauseHomeScroll(); updateProgress(); });
    listen(reducedMotion, 'change', () => {
      pauseHomeScroll();
      if (reducedMotion.matches) finishMenuClose();
    });
    scroller.addEventListener('wheel', (event) => {
      if (!desktop.matches) return;
      if (document.body.classList.contains('menu-open')) { event.preventDefault(); return; }
      event.preventDefault();
      move(Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY);
    }, { passive: false });
    scroller.addEventListener('scroll', () => {
      // Native touch, scrollbar and programmatic scrolling must become the next wheel origin.
      if (!raf) target = scroller.scrollLeft;
      updateProgress();
    }, { passive: true });
    listen(window, 'scroll', updateProgress, { passive: true });
    listen(document, 'keydown', (event) => {
      if (!desktop.matches) return;
      if (document.body.classList.contains('menu-open')) return;
      if (event.target instanceof HTMLElement && event.target.closest('input, textarea, button, a')) return;
      if (['ArrowRight', 'PageDown'].includes(event.key)) { event.preventDefault(); move(scroller.clientWidth * .7); }
      if (['ArrowLeft', 'PageUp'].includes(event.key)) { event.preventDefault(); move(-scroller.clientWidth * .7); }
    });
    updateProgress();
  }
  if (progress && !scroller) {
    const updateProgress = () => {
      const range = document.documentElement.scrollHeight - window.innerHeight;
      const value = String(Math.round(window.scrollY / (range || 1) * 100));
      if (progress.textContent !== value) progress.textContent = value;
    };
    listen(window, 'scroll', updateProgress, { passive: true });
    updateProgress();
  }

  const story = document.getElementById('project-story-scroll');
  if (story) {
    const storyMobile = window.matchMedia('(max-width: 768px)');
    const nextImage = story.querySelector('.project-story-next-image');
    const aside = document.querySelector('.project-story-aside');
    const storyCopy = aside?.querySelector('.project-story-copy');
    const hero = story.querySelector('.project-story-hero');
    const updateStory = () => {
      if (storyMobile.matches) {
        document.body.classList.toggle('project-story-past-hero', hero.getBoundingClientRect().bottom < 76);
      } else {
        const range = story.scrollHeight - story.clientHeight;
        if (progress) progress.textContent = String(Math.round(story.scrollTop / (range || 1) * 100));
        aside.classList.toggle('is-next', nextImage.getBoundingClientRect().top < story.getBoundingClientRect().bottom - story.clientHeight * .2);
      }
    };
    story.addEventListener('scroll', updateStory, { passive: true });
    listen(window, 'scroll', updateStory, { passive: true });
    listen(storyMobile, 'change', updateStory);
    const scrollStory = (event) => {
      event.preventDefault();
      story.scrollBy({ top: event.deltaY, behavior: 'instant' });
    };
    aside?.addEventListener('wheel', (event) => {
      if (storyMobile.matches || document.body.classList.contains('menu-open')) return;
      const overCopy = storyCopy?.contains(event.target);
      const remaining = storyCopy ? storyCopy.scrollHeight - storyCopy.clientHeight : 0;
      if (overCopy && remaining > 1 && ((event.deltaY < 0 && storyCopy.scrollTop > 0)
        || (event.deltaY > 0 && storyCopy.scrollTop < remaining - 1))) return;
      scrollStory(event);
    }, { passive: false });
    document.querySelector('.site-rail')?.addEventListener('wheel', (event) => {
      if (!storyMobile.matches && !document.body.classList.contains('menu-open')) scrollStory(event);
    }, { passive: false });
    updateStory();
  }

  const choices = [...document.querySelectorAll('.project-choice')];
  const stack = document.getElementById('project-image-stack');
  const projectLinks = [...(stack?.querySelectorAll('.project-image-link') || [])];
  const loadPreview = (image) => {
    if (!image?.dataset.src) return;
    image.srcset = image.dataset.srcset;
    image.src = image.dataset.src;
    delete image.dataset.srcset;
    delete image.dataset.src;
  };
  const legacyFilter = stack ? new URLSearchParams(location.search).get('filter') : null;
  if (stack && ['resorts', 'commercial'].includes(legacyFilter)) {
    location.replace(`/projects/${legacyFilter}/`);
  }
  let selectedProject = 0;
  let visibleProject = 0;
  let projectFrame = 0;
  let selectionVersion = 0;
  const moveStack = () => {
    stack.style.transform = `translate3d(0, ${-selectedProject * 100}%, 0)`;
  };
  const showProject = (index) => {
    if (index === visibleProject) return;
    visibleProject = index;
    choices.forEach((choice, i) => {
      choice.setAttribute('aria-pressed', String(i === index));
      choice.classList.toggle('is-active', i === index);
    });
    projectLinks.forEach((link, i) => {
      link.tabIndex = i === index ? 0 : -1;
      if (i === index) link.removeAttribute('aria-hidden');
      else link.setAttribute('aria-hidden', 'true');
    });
  };
  const followProject = () => {
    projectFrame = 0;
    const transform = getComputedStyle(stack).transform;
    const values = transform.startsWith('matrix3d(') ? transform.slice(9, -1).split(',') : transform.startsWith('matrix(') ? transform.slice(7, -1).split(',') : null;
    const offset = values ? Number(values[values.length === 16 ? 13 : 5]) : -selectedProject * stack.clientHeight;
    const height = stack.clientHeight || 1;
    showProject(Math.max(0, Math.min(projectLinks.length - 1, Math.round(-offset / height))));
    if (Math.abs(offset + selectedProject * height) > .5) projectFrame = requestAnimationFrame(followProject);
    else showProject(selectedProject);
  };
  const activateProject = async (button) => {
    if (!button || !stack) return;
    const index = Number(button.dataset.index);
    if (!projectLinks[index] || button.closest('li').hidden) return;
    const version = ++selectionVersion;
    const image = projectLinks[index].querySelector('img');
    loadPreview(image);
    if (index !== selectedProject) {
      try {
        if (!image.complete || !image.naturalWidth) await image.decode();
        if (!image.naturalWidth || version !== selectionVersion) return;
      } catch {
        return; // Retain the last usable preview and its accessible detail link.
      }
    }
    if (version !== selectionVersion) return;
    if (index !== selectedProject) {
      stack.parentElement.style.backgroundImage = `url("${projectLinks[visibleProject].querySelector('img').src}")`;
    }
    selectedProject = index;
    moveStack();
    if (reducedMotion.matches) showProject(index);
    else if (!projectFrame) projectFrame = requestAnimationFrame(followProject);
  };
  choices.forEach((button) => button.addEventListener('click', () => activateProject(button)));
  listen(reducedMotion, 'change', () => {
    if (!stack || !reducedMotion.matches) return;
    if (projectFrame) cancelAnimationFrame(projectFrame);
    projectFrame = 0;
    showProject(selectedProject);
  });

  if (document.querySelector('.contact-dialog')) {
    import('/assets/contact-interaction.js').then(({ initContact }) => initContact(controller.signal));
  }
})();
