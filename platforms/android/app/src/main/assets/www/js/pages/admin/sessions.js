import { getAllSessoes } from '../../services/sessoes.js';
import { esc, formatDateTime, formatCurrency, formatDuration, sessionStatusBadge } from '../../utils.js';

let currentFilter = 'all';

export function initAdminSessions(user) {
  // Filtros por chip
  document.getElementById('sessions-filter')?.addEventListener('click', e => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    currentFilter = chip.dataset.sessionStatus;
    document.querySelectorAll('#sessions-filter .chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    loadSessions();
  });

  loadSessions();
}

async function loadSessions() {
  const container = document.getElementById('admin-sessions-list');
  if (!container) return;

  container.innerHTML = `<div class="empty-state"><div class="spinner"></div></div>`;

  try {
    const sessoes = await getAllSessoes(currentFilter === 'all' ? null : currentFilter);
    render(container, sessoes);
  } catch (_) {
    container.innerHTML = `<div class="empty-state"><p class="text-danger">Erro ao carregar sessões.</p></div>`;
  }
}

function render(container, sessoes) {
  if (!sessoes.length) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="material-symbols-rounded empty-state__icon">receipt_long</span>
        <p class="empty-state__title">Nenhuma sessão encontrada</p>
      </div>`;
    return;
  }

  container.innerHTML = `<div class="card">
    ${sessoes.map(s => {
      const durMs = s.saida && s.entrada
        ? (s.saida.toMillis() - s.entrada.toMillis())
        : null;
      return `
        <div class="list-item">
          <div class="list-item__icon" style="background:var(--color-info-surface);color:var(--color-info)">
            <span class="material-symbols-rounded">directions_car</span>
          </div>
          <div class="list-item__content">
            <div class="d-flex align-center justify-between">
              <p class="list-item__title">Sessão ${esc(s.id?.slice(-6))}</p>
              ${sessionStatusBadge(s.status)}
            </div>
            <p class="list-item__subtitle">Entrada: ${formatDateTime(s.entrada)}</p>
            ${s.saida ? `<p class="list-item__subtitle">Saída: ${formatDateTime(s.saida)}</p>` : ''}
            ${durMs ? `<p class="list-item__subtitle">${formatDuration(durMs)} &middot; ${formatCurrency(s.valor)}</p>` : ''}
          </div>
        </div>`;
    }).join('')}
  </div>`;
}
