import { getAllSessoes, registrarSaida } from '../../services/sessoes.js';
import { registrarPagamento } from '../../services/pagamentos.js';
import { getTarifas } from '../../services/tarifas.js';
import { openModal } from '../../components/modal.js';
import { showToast } from '../../components/toast.js';
import { db } from '../../config/firebase.js';
import {
  doc, getDoc, updateDoc
} from 'firebase/firestore';
import { esc, formatDateTime, formatCurrency, formatDuration, sessionStatusBadge } from '../../utils.js';

let currentFilter = 'all';

export function initAdminSessions(user) {
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

    const enriched = await Promise.all(sessoes.map(async s => {
      const [veiculo, usuario] = await Promise.all([
        fetchDoc('veiculos', s.veiculoId),
        fetchDoc('usuarios', s.usuarioId)
      ]);
      return { ...s, veiculo, usuario };
    }));

    render(container, enriched);
  } catch (_) {
    container.innerHTML = `<div class="empty-state"><p class="text-danger">Erro ao carregar sessões.</p></div>`;
  }
}

async function fetchDoc(col, id) {
  if (!id) return null;
  const snap = await getDoc(doc(db, col, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
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
      const durMs  = s.saida && s.entrada ? (s.saida.toMillis() - s.entrada.toMillis()) : null;
      const placa  = s.veiculo?.placa || '—';
      const nome   = s.usuario?.nome || s.usuario?.email || 'Visitante';
      const canExit = s.status === 'em andamento';
      const canPay  = s.status === 'finalizada';

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
            <p class="list-item__subtitle">${esc(placa)} &middot; ${esc(nome)}</p>
            <p class="list-item__subtitle">Entrada: ${formatDateTime(s.entrada)}</p>
            ${s.saida ? `<p class="list-item__subtitle">Saída: ${formatDateTime(s.saida)}</p>` : ''}
            ${durMs ? `<p class="list-item__subtitle">${formatDuration(durMs)} &middot; ${formatCurrency(s.valor)}</p>` : ''}
            ${canExit ? `
              <button class="btn btn--warning btn--sm mt-2" data-action="exit" data-id="${s.id}">
                <span class="material-symbols-rounded" style="font-size:16px">logout</span>
                Registrar Saída e Pagamento
              </button>` : ''}
            ${canPay ? `
              <button class="btn btn--success btn--sm mt-2" data-action="pay" data-id="${s.id}">
                <span class="material-symbols-rounded" style="font-size:16px">payments</span>
                Registrar Pagamento
              </button>` : ''}
          </div>
        </div>`;
    }).join('')}
  </div>`;

  container.querySelectorAll('[data-action="exit"]').forEach(btn => {
    const sessao = sessoes.find(s => s.id === btn.dataset.id);
    if (sessao) btn.addEventListener('click', () => openExitModal(sessao));
  });

  container.querySelectorAll('[data-action="pay"]').forEach(btn => {
    const sessao = sessoes.find(s => s.id === btn.dataset.id);
    if (sessao) btn.addEventListener('click', () => openPayModal(sessao));
  });
}

function paymentOptions() {
  return `
    <option value="">Selecione</option>
    <option value="pix">PIX</option>
    <option value="cartao">Cartão</option>
    <option value="dinheiro">Dinheiro</option>`;
}

function openExitModal(sessao) {
  const placa     = sessao.veiculo?.placa || '—';
  const nome      = sessao.usuario?.nome || sessao.usuario?.email || 'Visitante';
  const now       = Date.now();
  const entradaMs = sessao.entrada?.toMillis?.() || now;
  const minutos   = Math.round((now - entradaMs) / 60000);

  let modalRef;
  modalRef = openModal({
    title: 'Registrar Saída e Pagamento',
    body: `
      <div class="card mb-4" style="border:1.5px solid var(--color-warning)">
        <div class="card__body card__body--compact">
          <div class="d-flex justify-between mb-2">
            <span class="text-muted text-sm">Placa</span>
            <span class="text-bold">${esc(placa)}</span>
          </div>
          <div class="d-flex justify-between mb-2">
            <span class="text-muted text-sm">Cliente</span>
            <span class="text-bold">${esc(nome)}</span>
          </div>
          <div class="d-flex justify-between mb-2">
            <span class="text-muted text-sm">Entrada</span>
            <span class="text-bold">${formatDateTime(sessao.entrada)}</span>
          </div>
          <div class="d-flex justify-between">
            <span class="text-muted text-sm">Tempo estimado</span>
            <span class="text-bold">${Math.floor(minutos / 60)}h ${minutos % 60}min</span>
          </div>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Forma de Pagamento <span>*</span></label>
        <select class="form-control" id="modal-payment-method">
          ${paymentOptions()}
        </select>
      </div>`,
    actions: [
      { label: 'Cancelar', className: 'btn--ghost' },
      {
        label: 'Confirmar',
        className: 'btn--warning',
        closeOnClick: false,
        onClick: async () => {
          const metodo = document.getElementById('modal-payment-method')?.value;
          if (!metodo) { showToast('Selecione a forma de pagamento.', 'warning'); return; }

          try {
            const tarifas = await getTarifas();
            const tarifa  = tarifas.find(t => t.id === sessao.tarifaId) || null;
            const { valor } = await registrarSaida(sessao.id, tarifa);

            await registrarPagamento({ sessaoId: sessao.id, usuarioId: sessao.usuarioId, valor, metodo });
            await updateDoc(doc(db, 'sessoes', sessao.id), { status: 'paga' });

            showToast(`Saída registrada! Total: ${formatCurrency(valor)}`, 'success', 5000);
            modalRef.close();
            loadSessions();
          } catch (err) {
            showToast(err.message, 'error');
          }
        }
      }
    ]
  });
}

function openPayModal(sessao) {
  const placa = sessao.veiculo?.placa || '—';
  const nome  = sessao.usuario?.nome || sessao.usuario?.email || 'Visitante';

  let modalRef;
  modalRef = openModal({
    title: 'Registrar Pagamento',
    body: `
      <div class="card mb-4" style="border:1.5px solid var(--color-success)">
        <div class="card__body card__body--compact">
          <div class="d-flex justify-between mb-2">
            <span class="text-muted text-sm">Placa</span>
            <span class="text-bold">${esc(placa)}</span>
          </div>
          <div class="d-flex justify-between mb-2">
            <span class="text-muted text-sm">Cliente</span>
            <span class="text-bold">${esc(nome)}</span>
          </div>
          <div class="d-flex justify-between mb-2">
            <span class="text-muted text-sm">Entrada</span>
            <span class="text-bold">${formatDateTime(sessao.entrada)}</span>
          </div>
          <div class="d-flex justify-between mb-2">
            <span class="text-muted text-sm">Saída</span>
            <span class="text-bold">${formatDateTime(sessao.saida)}</span>
          </div>
          <div class="d-flex justify-between">
            <span class="text-muted text-sm">Valor</span>
            <span class="text-bold">${formatCurrency(sessao.valor)}</span>
          </div>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Forma de Pagamento <span>*</span></label>
        <select class="form-control" id="modal-payment-method">
          ${paymentOptions()}
        </select>
      </div>`,
    actions: [
      { label: 'Cancelar', className: 'btn--ghost' },
      {
        label: 'Confirmar',
        className: 'btn--success',
        closeOnClick: false,
        onClick: async () => {
          const metodo = document.getElementById('modal-payment-method')?.value;
          if (!metodo) { showToast('Selecione a forma de pagamento.', 'warning'); return; }

          try {
            await registrarPagamento({ sessaoId: sessao.id, usuarioId: sessao.usuarioId, valor: sessao.valor, metodo });
            await updateDoc(doc(db, 'sessoes', sessao.id), { status: 'paga' });

            showToast(`Pagamento registrado! Total: ${formatCurrency(sessao.valor)}`, 'success', 5000);
            modalRef.close();
            loadSessions();
          } catch (err) {
            showToast(err.message, 'error');
          }
        }
      }
    ]
  });
}
