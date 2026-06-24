import { showToast } from '../../components/toast.js';
import { openModal, confirmModal } from '../../components/modal.js';
import { registerUnsub } from '../../unsubs.js';
import {
  onMensalistasChange,
  addMensalista,
  updateMensalista,
  deleteMensalista,
  STATUS_MENSALISTA
} from '../../services/mensalistas.js';
import { esc, formatDate, mensalistaStatusBadge } from '../../utils.js';
import { db } from '../../config/firebase.js';
import {
  collection, getDocs, query, where
} from 'firebase/firestore';

let allSubscribers = [];
let currentFilter  = 'all';
let unsubSubs = null;

export function initAdminSubscribers(user) {
  if (unsubSubs) unsubSubs();

  document.getElementById('btn-add-subscriber')?.addEventListener('click', () => openSubscriberModal(user));

  // Filtros por chip
  document.getElementById('subscriber-filter')?.addEventListener('click', e => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    currentFilter = chip.dataset.status;
    document.querySelectorAll('#subscriber-filter .chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    renderSubscribers();
  });

  unsubSubs = onMensalistasChange(subs => {
    allSubscribers = subs;
    renderSubscribers();
  });
  registerUnsub(unsubSubs);
}

function renderSubscribers() {
  const container = document.getElementById('subscribers-list');
  if (!container) return;

  const filtered = currentFilter === 'all'
    ? allSubscribers
    : allSubscribers.filter(s => s.status === currentFilter);

  if (!filtered.length) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="material-symbols-rounded empty-state__icon">card_membership</span>
        <p class="empty-state__title">Nenhum mensalista</p>
        <p class="empty-state__text">Cadastre mensalistas para gerenciá-los aqui.</p>
      </div>`;
    return;
  }

  container.innerHTML = `<div class="card">
    ${filtered.map(s => `
      <div class="list-item">
        <div class="list-item__icon" style="background:${s.status === 'ativo' ? 'var(--color-success-surface)' : 'var(--color-danger-surface)'};color:${s.status === 'ativo' ? 'var(--color-success)' : 'var(--color-danger)'}">
          <span class="material-symbols-rounded">card_membership</span>
        </div>
        <div class="list-item__content">
          <div class="d-flex align-center justify-between">
            <p class="list-item__title">${esc(s.plano)}</p>
            ${mensalistaStatusBadge(s.status)}
          </div>
          <p class="list-item__subtitle">Vencimento: ${formatDate(s.vencimento)}</p>
        </div>
        <div style="display:flex;gap:4px">
          <button class="icon-btn" data-action="edit" data-id="${s.id}" title="Editar">
            <span class="material-symbols-rounded">edit</span>
          </button>
          <button class="icon-btn icon-btn--danger" data-action="delete" data-id="${s.id}" title="Excluir">
            <span class="material-symbols-rounded">delete</span>
          </button>
        </div>
      </div>`).join('')}
  </div>`;

  container.querySelectorAll('[data-action="edit"]').forEach(btn => {
    const sub = allSubscribers.find(s => s.id === btn.dataset.id);
    btn.addEventListener('click', () => openSubscriberModal(null, sub));
  });

  container.querySelectorAll('[data-action="delete"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const ok = await confirmModal({
        title: 'Excluir mensalista',
        message: 'Confirmar exclusão deste mensalista?',
        confirmLabel: 'Excluir'
      });
      if (!ok) return;
      try {
        await deleteMensalista(btn.dataset.id);
        showToast('Mensalista excluído.', 'success');
      } catch (err) { showToast(err.message, 'error'); }
    });
  });
}

function openSubscriberModal(adminUser, sub = null) {
  const editing = !!sub;

  // Formata data para o input date
  let vencimentoVal = '';
  if (sub?.vencimento) {
    const d = sub.vencimento.toDate ? sub.vencimento.toDate() : new Date(sub.vencimento);
    vencimentoVal = d.toISOString().slice(0, 10);
  }

  const { close } = openModal({
    title: editing ? 'Editar mensalista' : 'Novo mensalista',
    body: `
      <form class="form-stack" id="modal-sub-form">
        ${!editing ? `
        <div class="form-group">
          <label class="form-label">E-mail do cliente <span>*</span></label>
          <input type="email" class="form-control" id="msub-email"
            placeholder="email@cliente.com" />
          <p class="form-hint">O cliente deve estar cadastrado no sistema.</p>
        </div>
        <div class="form-group">
          <label class="form-label">Placa do veículo <span>*</span></label>
          <input type="text" class="form-control" id="msub-plate"
            placeholder="AAA-0000" style="text-transform:uppercase" />
        </div>` : ''}
        <div class="form-group">
          <label class="form-label">Plano <span>*</span></label>
          <input type="text" class="form-control" id="msub-plan"
            placeholder="Ex: Mensal básico"
            value="${esc(sub?.plano || '')}" required />
        </div>
        <div class="form-group">
          <label class="form-label">Vencimento <span>*</span></label>
          <input type="date" class="form-control" id="msub-expiry"
            value="${vencimentoVal}" required />
        </div>
        ${editing ? `
        <div class="form-group">
          <label class="form-label">Status</label>
          <select class="form-control" id="msub-status">
            <option value="ativo"     ${sub?.status === 'ativo'     ? 'selected' : ''}>Ativo</option>
            <option value="vencido"   ${sub?.status === 'vencido'   ? 'selected' : ''}>Vencido</option>
            <option value="cancelado" ${sub?.status === 'cancelado' ? 'selected' : ''}>Cancelado</option>
          </select>
        </div>` : ''}
      </form>`,
    actions: [
      { label: 'Cancelar', className: 'btn--ghost' },
      {
        label: editing ? 'Salvar' : 'Cadastrar',
        className: 'btn--primary',
        closeOnClick: false,
        onClick: async () => {
          const plano      = document.getElementById('msub-plan')?.value.trim();
          const vencimento = document.getElementById('msub-expiry')?.value;

          if (!plano || !vencimento) {
            showToast('Preencha todos os campos obrigatórios.', 'warning');
            return;
          }

          try {
            if (editing) {
              const status = document.getElementById('msub-status')?.value;
              await updateMensalista(sub.id, { plano, vencimento, status });
              showToast('Mensalista atualizado!', 'success');
            } else {
              const email = document.getElementById('msub-email')?.value.trim();
              const plate = document.getElementById('msub-plate')?.value.trim().toUpperCase();

              if (!email || !plate) {
                showToast('Informe o e-mail e a placa do veículo.', 'warning');
                return;
              }

              const { usuarioId, veiculoId } = await resolveUserAndVehicle(email, plate);
              await addMensalista({ usuarioId, veiculoId, plano, vencimento });
              showToast('Mensalista cadastrado!', 'success');
            }
            close();
          } catch (err) { showToast(err.message, 'error'); }
        }
      }
    ]
  });
}

async function resolveUserAndVehicle(email, plate) {
  const uSnap = await getDocs(query(collection(db, 'usuarios'), where('email', '==', email)));
  if (uSnap.empty) throw new Error('Usuário não encontrado com este e-mail.');
  const usuarioId = uSnap.docs[0].id;

  const vSnap = await getDocs(
    query(collection(db, 'veiculos'),
      where('usuarioId', '==', usuarioId),
      where('placa', '==', plate))
  );
  if (vSnap.empty) throw new Error('Veículo não encontrado para este cliente.');
  const veiculoId = vSnap.docs[0].id;

  return { usuarioId, veiculoId };
}
