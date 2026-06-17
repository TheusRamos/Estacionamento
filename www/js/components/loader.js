/**
 * Gerencia o estado de loading de botões e da tela.
 */

export function setButtonLoading(btn, loading) {
  if (!btn) return;
  btn.classList.toggle('loading', loading);
  btn.disabled = loading;
}

export function showPageLoader() {
  let loader = document.getElementById('global-loader');
  if (!loader) {
    loader = document.createElement('div');
    loader.id = 'global-loader';
    loader.className = 'page-loader';
    loader.innerHTML = `<div class="spinner"></div>`;
    document.body.appendChild(loader);
  }
  loader.style.display = 'flex';
}

export function hidePageLoader() {
  const loader = document.getElementById('global-loader');
  if (loader) loader.style.display = 'none';
}
