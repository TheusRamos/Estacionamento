const ICONS = {
  success: 'check_circle',
  error:   'error',
  warning: 'warning',
  info:    'info'
};

/**
 * Exibe uma notificação toast.
 * @param {string} message - Mensagem a exibir
 * @param {'success'|'error'|'warning'|'info'} type
 * @param {number} duration - Duração em ms (padrão 3500)
 */
export function showToast(message, type = 'info', duration = 3500) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.innerHTML = `
    <span class="material-symbols-rounded toast__icon">${ICONS[type]}</span>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  const remove = () => {
    toast.classList.add('removing');
    let fired = false;
    const done = () => { if (fired) return; fired = true; toast.remove(); };
    toast.addEventListener('animationend', done, { once: true });
    setTimeout(done, 300);
  };

  setTimeout(remove, duration);
  toast.addEventListener('click', remove);
}
