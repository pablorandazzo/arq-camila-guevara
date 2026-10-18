(() => {
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
      else closeTimer = setTimeout(finishMenuClose, 1200);
    }
  };
  menu?.addEventListener('transitionend', (event) => {
    if (event.target === menu && event.propertyName === 'visibility') finishMenuClose();
  });
  window.addEventListener('pageshow', (event) => {
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
  document.addEventListener('keydown', (event) => {
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
  reducedMotion.addEventListener('change', () => { if (reducedMotion.matches) finishMenuClose(); });
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
    window.addEventListener('scroll', queueParallax, { passive: true });
    mobile.addEventListener('change', updateParallax);
    reducedMotion.addEventListener('change', updateParallax);
    updateParallax();
  }
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
      if (progress) progress.textContent = String(Math.round((desktop.matches ? scroller.scrollLeft / (maxScroll() || 1) : window.scrollY / (range || 1)) * 100));
      document.querySelector('.logo')?.classList.toggle('is-light', desktop.matches && scroller.scrollLeft < scroller.clientWidth - 100);
    };
    desktop.addEventListener('change', () => { pauseHomeScroll(); updateProgress(); });
    reducedMotion.addEventListener('change', () => {
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
    window.addEventListener('scroll', updateProgress, { passive: true });
    document.addEventListener('keydown', (event) => {
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
      progress.textContent = String(Math.round(window.scrollY / (range || 1) * 100));
    };
    window.addEventListener('scroll', updateProgress, { passive: true });
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
    window.addEventListener('scroll', updateStory, { passive: true });
    storyMobile.addEventListener('change', updateStory);
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
  const projectDesktop = window.matchMedia('(min-width: 769px)');
  const loadProjectStack = () => {
    if (!stack || !projectDesktop.matches) return;
    projectLinks.forEach((link) => {
      const image = link.querySelector('img');
      if (image.dataset.src) {
        image.src = image.dataset.src;
        delete image.dataset.src;
      }
    });
  };
  loadProjectStack();
  projectDesktop.addEventListener('change', loadProjectStack);
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
    if (image.dataset.src) {
      image.src = image.dataset.src;
      delete image.dataset.src;
    }
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
  reducedMotion.addEventListener('change', () => {
    if (!stack || !reducedMotion.matches) return;
    if (projectFrame) cancelAnimationFrame(projectFrame);
    projectFrame = 0;
    showProject(selectedProject);
  });

  const dialog = document.querySelector('.contact-dialog');
  const opener = document.querySelector('[data-open-contact]');
  const dialogBackground = [...document.body.children].filter(element => element !== dialog && element.tagName !== 'SCRIPT');
  const dialogPreviousInert = new Map();
  let dialogScroll;
  let dialogTimer;
  const finishDialogClose = () => {
    if (!dialog?.classList.contains('is-closing')) return;
    clearTimeout(dialogTimer);
    dialog.classList.remove('is-closing');
    dialog.inert = true;
    dialogBackground.forEach(element => { element.inert = dialogPreviousInert.get(element) ?? false; });
    dialogPreviousInert.clear();
    document.body.classList.remove('contact-open');
    document.body.style.position = dialogScroll.position;
    document.body.style.top = dialogScroll.top;
    document.body.style.width = dialogScroll.width;
    window.scrollTo(0, dialogScroll.y);
    dialogScroll = null;
    opener?.focus({ preventScroll: true });
  };
  const closeDialog = () => {
    if (!dialog?.classList.contains('is-open')) return;
    dialog.classList.remove('is-open');
    dialog.classList.add('is-closing');
    if (reducedMotion.matches) finishDialogClose();
    else dialogTimer = setTimeout(finishDialogClose, mobile.matches ? 900 : 500);
  };
  opener?.addEventListener('click', () => {
    if (!dialog || dialog.classList.contains('is-open')) return;
    clearTimeout(dialogTimer);
    dialog.classList.remove('is-closing');
    if (!dialogScroll) {
      dialogScroll = { y: window.scrollY, position: document.body.style.position, top: document.body.style.top, width: document.body.style.width };
      document.body.style.position = 'fixed';
      document.body.style.top = `-${dialogScroll.y}px`;
      document.body.style.width = '100%';
      dialogBackground.forEach(element => { dialogPreviousInert.set(element, element.inert); element.inert = true; });
    }
    dialog.inert = false;
    document.body.classList.add('contact-open');
    dialog.classList.add('is-open');
    requestAnimationFrame(() => {
      if (dialog.classList.contains('is-open')) dialog.querySelector('.dialog-close')?.focus({ preventScroll: true });
    });
  });
  dialog?.addEventListener('transitionend', (event) => {
    if (event.target === dialog.querySelector('.dialog-body') && event.propertyName === 'transform') finishDialogClose();
  });
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) finishDialogClose();
  });
  dialog?.querySelector('.dialog-close')?.addEventListener('click', closeDialog);
  dialog?.addEventListener('click', (event) => { if (event.target === dialog || event.target.classList.contains('dialog-backdrop')) closeDialog(); });
  window.addEventListener('pageshow', (event) => { if (event.persisted && dialogScroll) { dialog.classList.add('is-closing'); finishDialogClose(); } });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && dialog?.classList.contains('is-open')) closeDialog();
    if (event.key === 'Tab' && dialog?.classList.contains('is-open')) {
      const focusable = [...dialog.querySelectorAll('button, input, textarea')];
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });
  document.querySelector('#contact-form')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const subject = encodeURIComponent(String(data.get('subject') || 'Consulta de proyecto'));
    const body = encodeURIComponent(`${data.get('message')}\n\n${data.get('name')}\n${data.get('email')}`);
    document.querySelector('.form-message').textContent = 'Se abrirá tu aplicación de correo para enviar la consulta.';
    location.href = `mailto:${form.dataset.recipient}?subject=${subject}&body=${body}`;
  });
})();
