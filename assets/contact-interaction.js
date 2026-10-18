export function initContact(signal) {
  const dialog = document.querySelector('.contact-dialog');
  if (!dialog || signal?.aborted) return;
  const opener = document.querySelector('[data-open-contact]');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = window.matchMedia('(max-width: 768px)');
  const listen = (target, type, handler) => target?.addEventListener(type, handler, { signal });
  const dialogBackground = [...document.body.children].filter(element => element !== dialog && element.tagName !== 'SCRIPT');
  const dialogPreviousInert = new Map();
  let dialogScroll;
  let dialogTimer;
  const finishDialogClose = () => {
    if (!dialog.classList.contains('is-closing')) return;
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
    if (!dialog.classList.contains('is-open')) return;
    dialog.classList.remove('is-open');
    dialog.classList.add('is-closing');
    if (reducedMotion.matches) finishDialogClose();
    else dialogTimer = setTimeout(finishDialogClose, mobile.matches ? 600 : 420);
  };
  listen(opener, 'click', () => {
    if (dialog.classList.contains('is-open')) return;
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
  listen(dialog, 'transitionend', (event) => {
    if (event.target === dialog.querySelector('.dialog-body') && event.propertyName === 'transform') finishDialogClose();
  });
  listen(reducedMotion, 'change', () => {
    if (reducedMotion.matches) finishDialogClose();
  });
  listen(dialog.querySelector('.dialog-close'), 'click', closeDialog);
  listen(dialog, 'click', (event) => { if (event.target === dialog || event.target.classList.contains('dialog-backdrop')) closeDialog(); });
  listen(window, 'pageshow', (event) => { if (event.persisted && dialogScroll) { dialog.classList.add('is-closing'); finishDialogClose(); } });
  listen(document, 'keydown', (event) => {
    if (event.key === 'Escape' && dialog.classList.contains('is-open')) closeDialog();
    if (event.key === 'Tab' && dialog.classList.contains('is-open')) {
      const focusable = [...dialog.querySelectorAll('button, input, textarea')];
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });
  listen(document.querySelector('#contact-form'), 'submit', (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const subject = encodeURIComponent(String(data.get('subject') || 'Consulta de proyecto'));
    const body = encodeURIComponent(`${data.get('message')}\n\n${data.get('name')}\n${data.get('email')}`);
    document.querySelector('.form-message').textContent = 'Se abrirá tu aplicación de correo para enviar la consulta.';
    location.href = `mailto:${form.dataset.recipient}?subject=${subject}&body=${body}`;
  });
}
