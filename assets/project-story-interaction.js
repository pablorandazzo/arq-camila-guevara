export function initProjectStory({ listen, progress, signal }) {
  const story = document.getElementById('project-story-scroll');
  if (!story) return;
  const storyMobile = window.matchMedia('(max-width: 768px)');
  const nextImage = story.querySelector('.project-story-next-image');
  const aside = document.querySelector('.project-story-aside');
  const storyCopy = aside?.querySelector('.project-story-copy');
  const hero = story.querySelector('.project-story-hero');
  let frame = 0;
  const updateStory = () => {
    frame = 0;
    if (storyMobile.matches) {
      document.body.classList.toggle('project-story-past-hero', hero.getBoundingClientRect().bottom < 76);
    } else {
      const range = story.scrollHeight - story.clientHeight;
      const value = String(Math.round(story.scrollTop / (range || 1) * 100));
      if (progress && progress.textContent !== value) progress.textContent = value;
      aside.classList.toggle('is-next', nextImage.getBoundingClientRect().top < story.getBoundingClientRect().bottom - story.clientHeight * .2);
    }
  };
  const scheduleStory = () => { if (!frame) frame = requestAnimationFrame(updateStory); };
  signal?.addEventListener('abort', () => { if (frame) cancelAnimationFrame(frame); }, { once: true });
  listen(story, 'scroll', scheduleStory, { passive: true });
  listen(window, 'scroll', scheduleStory, { passive: true });
  listen(storyMobile, 'change', scheduleStory);
  const scrollStory = (event) => {
    event.preventDefault();
    story.scrollBy({ top: event.deltaY, behavior: 'instant' });
  };
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
