export function initProjectStory({ listen, progress, signal }) {
  const story = document.getElementById('project-story-scroll');
  if (!story) return;
  const storyMobile = window.matchMedia('(max-width: 768px)');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const nextImage = story.querySelector('.project-story-next-image');
  const aside = document.querySelector('.project-story-aside');
  const storyCopy = aside?.querySelector('.project-story-copy');
  const hero = story.querySelector('.project-story-hero');
  let frame = 0;
  let wheelFrame = 0;
  let wheelTarget = story.scrollTop;
  let lastWheelTime = 0;
  let scrollRange = 0;
  let nextThreshold = 0;
  const stopWheel = () => {
    if (wheelFrame) cancelAnimationFrame(wheelFrame);
    wheelFrame = 0;
    lastWheelTime = 0;
    wheelTarget = story.scrollTop;
  };
  const animateWheel = (time) => {
    const elapsed = lastWheelTime ? Math.min(50, time - lastWheelTime) : 16.67;
    lastWheelTime = time;
    const distance = wheelTarget - story.scrollTop;
    const step = distance * (1 - Math.exp(-elapsed / 75));
    if (Math.abs(distance) <= 1 || Math.abs(step) < 1) {
      story.scrollTop = wheelTarget;
      wheelFrame = 0;
      lastWheelTime = 0;
      return;
    }
    story.scrollTop += step;
    wheelFrame = requestAnimationFrame(animateWheel);
  };
  const measureStory = () => {
    scrollRange = story.scrollHeight - story.clientHeight;
    nextThreshold = nextImage.offsetTop - story.offsetTop - story.clientHeight * .8;
  };
  measureStory();
  const updateStory = () => {
    frame = 0;
    if (storyMobile.matches) {
      document.body.classList.toggle('project-story-past-hero', hero.getBoundingClientRect().bottom < 76);
    } else {
      const value = String(Math.round(story.scrollTop / (scrollRange || 1) * 100));
      if (progress && progress.textContent !== value) progress.textContent = value;
      aside.classList.toggle('is-next', story.scrollTop > nextThreshold);
    }
  };
  const scheduleStory = () => { if (!frame) frame = requestAnimationFrame(updateStory); };
  signal?.addEventListener('abort', () => {
    if (frame) cancelAnimationFrame(frame);
    stopWheel();
  }, { once: true });
  listen(story, 'scroll', () => {
    if (!wheelFrame) wheelTarget = story.scrollTop;
    scheduleStory();
  }, { passive: true });
  listen(window, 'scroll', scheduleStory, { passive: true });
  listen(window, 'resize', () => { stopWheel(); measureStory(); scheduleStory(); }, { passive: true });
  listen(window, 'load', () => { measureStory(); scheduleStory(); });
  listen(storyMobile, 'change', () => { stopWheel(); measureStory(); scheduleStory(); });
  listen(reducedMotion, 'change', stopWheel);
  listen(story, 'pointerdown', stopWheel, { passive: true });
  const scrollStory = (event) => {
    if (storyMobile.matches || !event.deltaY) return;
    event.preventDefault();
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? story.clientHeight : 1;
    const delta = event.deltaY * unit;
    if (reducedMotion.matches) {
      stopWheel();
      story.scrollBy({ top: delta, behavior: 'instant' });
      return;
    }
    wheelTarget = Math.max(0, Math.min(scrollRange, wheelTarget + delta));
    if (!wheelFrame) wheelFrame = requestAnimationFrame(animateWheel);
  };
  listen(story, 'wheel', (event) => {
    if (!document.body.classList.contains('menu-open')) scrollStory(event);
  }, { passive: false });
  listen(aside, 'wheel', (event) => {
    if (storyMobile.matches || document.body.classList.contains('menu-open')) return;
    const overCopy = storyCopy?.contains(event.target);
    const remaining = storyCopy ? storyCopy.scrollHeight - storyCopy.clientHeight : 0;
    if (overCopy && remaining > 1 && ((event.deltaY < 0 && storyCopy.scrollTop > 0)
      || (event.deltaY > 0 && storyCopy.scrollTop < remaining - 1))) return;
    scrollStory(event);
  }, { passive: false });
  listen(document.querySelector('.site-rail'), 'wheel', (event) => {
    if (!storyMobile.matches && !document.body.classList.contains('menu-open')) scrollStory(event);
  }, { passive: false });
  updateStory();
}
