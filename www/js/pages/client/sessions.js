import { getSessoesDoUsuario } from '../../services/sessoes.js';
import { getReservasDoUsuario } from '../../services/reservas.js';
import { getPagamentosDoUsuario } from '../../services/pagamentos.js';
import { esc, formatDateTime, formatCurrency, formatDuration, sessionStatusBadge, reservaStatusBadge } from '../../utils.js';

let currentHistoryTab = 'sessions';
let currentUser = null;

export function initClientSessions(user) {
  currentUser = user;

  const tabs = document.getElementById('history-tabs');
  tabs?.addEventListener('click', e => {
    const btn = e.target.closest('[data-history-tab]');
    if (!btn) return;
    currentHistoryTab = btn.dataset.historyTab;
    tabs.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    loadHistoryTab(currentHistoryTab);
  });

  // Carrega quando a aba de histórico fica visível
  document.querySelector('[data-tab="client-sessions"]')?.addEventListener('click', () => {
    loadHistoryTab(currentHistoryTab);
  });

  loadHistoryTab('sessions');
}

async function loadHistoryTab(tab) {
  const container = document.getElementById('history-content');
  if (!container || !currentUser) return;

  container.innerHTML = `<div class="empty-state"><div class="spinner"></div></div>`;

  try {
    if (tab === 'sessions') {
      const sessoes = await getSessoesDoUsuario(currentUser.uid);
      renderSessions(container, sessoes);
    } else if (tab === 'reservations') {
      const reservas = await getReservasDoUsuario(currentUser.uid);
      renderReservations(container, reservas);
    } else if (tab === 'payments') {
      const pagamentos = await getPagamentosDoUsuario(currentUser.uid);
      renderPayments(container, pagamentos);
    }
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><p class="text-danger">Erro ao carregar dados.</p></div>`;
  }
}

function renderSessions(container, sessoes) {
  if (!sessoes.length) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="material-symbols-rounded empty-state__icon">receipt_long</span>
        <p class="empty-state__title">Nenhuma sessão</p>
        <p class="empty-state__text">Suas sessões de estacionamento aparecerão aqui.</p>
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
              <p class="list-item__title">Vaga ${esc(s.vagaId?.slice(-6) || '—')}</p>
              ${sessionStatusBadge(s.status)}
            </div>
            <p class="list-item__subtitle">${formatDateTime(s.entrada)}</p>
            ${durMs ? `<p class="list-item__subtitle">${formatDuration(durMs)} &middot; ${formatCurrency(s.valor)}</p>` : ''}
          </div>
        </div>`;
    }).join('')}
  </div>`;
}

function renderReservations(container, reservas) {
  if (!reservas.length) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="material-symbols-rounded empty-state__icon">bookmark</span>
        <p class="empty-state__title">Nenhuma reserva</p>
        <p class="empty-state__text">Suas reservas aparecerão aqui.</p>
      </div>`;
    return;
  }

  container.innerHTML = `<div class="card">
    ${reservas.map(r => `
      <div class="list-item">
        <div class="list-item__icon" style="background:var(--color-warning-surface);color:var(--color-warning)">
          <span class="material-symbols-rounded">bookmark</span>
        </div>
        <div class="list-item__content">
          <div class="d-flex align-center justify-between">
            <p class="list-item__title">Reserva</p>
            ${reservaStatusBadge(r.status)}
          </div>
          <p class="list-item__subtitle">${formatDateTime(r.criadoEm)}</p>
          <p class="list-item__subtitle">Expira: ${formatDateTime(r.expiraEm)}</p>
        </div>
      </div>`).join('')}
  </div>`;
}

function renderPayments(container, pagamentos) {
  if (!pagamentos.length) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="material-symbols-rounded empty-state__icon">payments</span>
        <p class="empty-state__title">Nenhum pagamento</p>
        <p class="empty-state__text">Seus pagamentos aparecerão aqui.</p>
      </div>`;
    return;
  }

  container.innerHTML = `<div class="card">
    ${pagamentos.map(p => `
      <div class="list-item">
        <div class="list-item__icon" style="background:var(--color-success-surface);color:var(--color-success)">
          <span class="material-symbols-rounded">payments</span>
        </div>
        <div class="list-item__content">
          <div class="d-flex align-center justify-between">
            <p class="list-item__title">${formatCurrency(p.valor)}</p>
            <span class="badge badge--success">${esc(p.metodo)}</span>
          </div>
          <p class="list-item__subtitle">${formatDateTime(p.criadoEm)}</p>
        </div>
      </div>`).join('')}
  </div>`;
}
