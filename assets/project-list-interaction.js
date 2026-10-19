export function initProjectList({ listen, reducedMotion, signal }) {
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
  let selectedProject = 0;
  let visibleProject = 0;
  let projectFrame = 0;
  let selectionVersion = 0;
  signal?.addEventListener('abort', () => {
    selectionVersion++;
    if (projectFrame) cancelAnimationFrame(projectFrame);
  }, { once: true });
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
    if (!button) return;
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
  choices.forEach((button) => listen(button, 'click', () => activateProject(button)));
  listen(reducedMotion, 'change', () => {
    if (!reducedMotion.matches) return;
    if (projectFrame) cancelAnimationFrame(projectFrame);
    projectFrame = 0;
    showProject(selectedProject);
  });
}
