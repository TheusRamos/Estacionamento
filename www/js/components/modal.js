/**
 * Cria e exibe um modal bottom sheet.
 *
 * @param {Object} options
 * @param {string}   options.title
 * @param {string}   options.body     - HTML do corpo
 * @param {Array}    options.actions  - [{label, className, onClick, closeOnClick}]
 * @param {Function} options.onClose
 * @returns {{ close: Function }}
 */
export function openModal({ title, body, actions = [], onClose } = {}) {
  const container = document.getElementById('modal-container');

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true">
      <div class="modal__handle"></div>
      <div class="modal__header">
        <h2 class="modal__title">${title || ''}</h2>
        <button class="modal__close icon-btn" aria-label="Fechar">
          <span class="material-symbols-rounded">close</span>
        </button>
      </div>
      <div class="modal__body">${body || ''}</div>
      ${actions.length ? `<div class="modal__footer">${actions.map((a, i) =>
        `<button class="btn ${a.className || 'btn--ghost'}" data-action="${i}">${a.label}</button>`
      ).join('')}</div>` : ''}
    </div>
  `;

  const close = () => {
    overlay.classList.add('closing');
    overlay.addEventListener('animationend', () => {
      overlay.remove();
      onClose?.();
    }, { once: true });
  };

  overlay.querySelector('.modal__close').addEventListener('click', close);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

  actions.forEach((action, i) => {
    overlay.querySelector(`[data-action="${i}"]`)?.addEventListener('click', () => {
      action.onClick?.();
      if (action.closeOnClick !== false) close();
    });
  });

  container.appendChild(overlay);
  return { close };
}

/**
 * Modal de confirmação simples.
 * @returns {Promise<boolean>}
 */
export function confirmModal({ title, message, confirmLabel = 'Confirmar', confirmClass = 'btn--danger' }) {
  return new Promise(resolve => {
    openModal({
      title,
      body: `<p class="text-muted">${message}</p>`,
      actions: [
        { label: 'Cancelar',      className: 'btn--ghost',   onClick: () => resolve(false) },
        { label: confirmLabel,    className: confirmClass,   onClick: () => resolve(true)  }
      ],
      onClose: () => resolve(false)
    });
  });
}
