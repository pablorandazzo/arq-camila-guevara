export function initScrollVisuals({ listen, signal, reducedMotion }) {
  if (!('IntersectionObserver' in window)) return;

  const images = document.querySelectorAll(
    '.home-about>img, .home-featured-projects .card-image img, .projects-mobile-list .card-image img, .project-story-hero img, .project-story-image img, .project-story-next-image img, .contact-image-frame img'
  );
  if (!images.length) return;

  const visible = new Map();
  const lastOffsets = new WeakMap();
  const horizontalHome = document.getElementById('home-scroll');
  const projectStory = document.getElementById('project-story-scroll');
  const desktop = window.matchMedia('(min-width: 769px)');
  let frame = 0;
  const update = () => {
    frame = 0;
    if (reducedMotion.matches) return;
    for (const [container, image] of visible) {
      const rect = container.getBoundingClientRect();
      const horizontal = desktop.matches && horizontalHome?.contains(container);
      const extent = horizontal ? rect.width : rect.height;
      const viewport = horizontal ? window.innerWidth : window.innerHeight;
      const center = horizontal ? rect.left + extent / 2 : rect.top + extent / 2;
      const progress = Math.max(-1, Math.min(1, (center - viewport / 2) / ((extent + viewport) / 2)));
      const offset = (-progress * Math.min(14, extent * .025)).toFixed(1);
      const translate = horizontal ? `${offset}px 0` : `0 ${offset}px`;
      if (lastOffsets.get(image) !== translate) {
        image.style.translate = translate;
        lastOffsets.set(image, translate);
      }
    }
  };
  const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
  const byContainer = new Map([...images].map(image => [
    image.closest('.card-image, .project-story-hero, .project-story-image, .project-story-next-image, .contact-image-frame') ?? image,
    image,
  ]));
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      const image = byContainer.get(entry.target);
      if (entry.isIntersecting && !reducedMotion.matches) {
        visible.set(entry.target, image);
        image.classList.add('scroll-visual-image');
      } else {
        visible.delete(entry.target);
        image.classList.remove('scroll-visual-image');
        image.style.translate = '';
        lastOffsets.delete(image);
      }
    }
    schedule();
  }, { rootMargin: '80px 0px' });
  for (const container of byContainer.keys()) observer.observe(container);

  listen(window, 'scroll', schedule, { passive: true });
  listen(horizontalHome, 'scroll', schedule, { passive: true });
  listen(projectStory, 'scroll', schedule, { passive: true });
  listen(window, 'resize', schedule, { passive: true });
  listen(desktop, 'change', schedule);
  const cleanup = () => {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    observer.disconnect();
    visible.clear();
    for (const image of images) {
      image.classList.remove('scroll-visual-image');
      image.style.translate = '';
      lastOffsets.delete(image);
    }
  };
  listen(reducedMotion, 'change', () => {
    if (reducedMotion.matches) cleanup();
    else {
      observer.disconnect();
      for (const [container, image] of byContainer) {
        observer.observe(container);
        const rect = container.getBoundingClientRect();
        if (rect.bottom >= -80 && rect.top <= window.innerHeight + 80 && rect.right >= 0 && rect.left <= window.innerWidth) {
          visible.set(container, image);
          image.classList.add('scroll-visual-image');
        }
      }
      schedule();
    }
  });
  signal?.addEventListener('abort', cleanup, { once: true });
}
