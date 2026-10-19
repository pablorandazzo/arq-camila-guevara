export function initProjectList({ listen, signal }) {
  const stack = document.getElementById('project-image-stack');
  if (!stack) return;
  const choices = [...document.querySelectorAll('.project-choice')];
  const projectLinks = [...stack.querySelectorAll('.project-image-link')];
  const loadPreview = (image) => {
    if (!image?.dataset.src) return;
    image.srcset = image.dataset.srcset;
    image.src = image.dataset.src;
    delete image.dataset.srcset;
    delete image.dataset.src;
  };
  const legacyFilter = new URLSearchParams(location.search).get('filter');
  if (['resorts', 'commercial'].includes(legacyFilter)) {
    location.replace(`/projects/${legacyFilter}/`);
  }
  let visibleProject = 0;
  let selectionVersion = 0;
  signal?.addEventListener('abort', () => {
    selectionVersion++;
  }, { once: true });
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
  const activateProject = async (button) => {
    if (!button) return;
    const index = Number(button.dataset.index);
    if (!projectLinks[index] || button.closest('li').hidden) return;
    const version = ++selectionVersion;
    const image = projectLinks[index].querySelector('img');
    loadPreview(image);
    if (index !== visibleProject) {
      try {
        if (!image.complete || !image.naturalWidth) await image.decode();
        if (!image.naturalWidth || version !== selectionVersion) return;
      } catch {
        return; // Retain the last usable preview and its accessible detail link.
      }
    }
    if (version !== selectionVersion) return;
    showProject(index);
  };
  choices.forEach((button) => listen(button, 'click', () => activateProject(button)));
}
