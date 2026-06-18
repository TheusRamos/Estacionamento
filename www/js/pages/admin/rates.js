import { showToast } from '../../components/toast.js';
import { openModal, confirmModal } from '../../components/modal.js';
import { registerUnsub } from '../../unsubs.js';
import { onTarifasChange, addTarifa, updateTarifa, deleteTarifa } from '../../services/tarifas.js';
import { esc, formatCurrency, tipoTarifaLabel } from '../../utils.js';

let unsubRates = null;

export function initAdminRates(user) {
  if (unsubRates) unsubRates();

  document.getElementById('btn-add-rate')?.addEventListener('click', () => openRateModal());
  document.getElementById('btn-add-rate-empty')?.addEventListener('click', () => openRateModal());

  unsubRates = onTarifasChange(tarifas => {
    renderRates(tarifas);
  });
  registerUnsub(unsubRates);
}

function renderRates(tarifas) {
  const container = document.getElementById('rates-list');
  if (!container) return;

  if (!tarifas.length) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="material-symbols-rounded empty-state__icon">payments</span>
        <p class="empty-state__title">Nenhuma tarifa</p>
        <p class="empty-state__text">Cadastre tarifas para calcular o valor das sessões.</p>
        <button class="btn btn--primary mt-4" id="btn-add-rate-empty-inner">
          <span class="material-symbols-rounded">add</span>
          Nova tarifa
        </button>
      </div>`;
    document.getElementById('btn-add-rate-empty-inner')?.addEventListener('click', () => openRateModal());
    return;
  }

  container.innerHTML = `<div class="card">
    ${tarifas.map(t => `
      <div class="list-item">
        <div class="list-item__icon" style="background:var(--color-success-surface);color:var(--color-success)">
          <span class="material-symbols-rounded">payments</span>
        </div>
        <div class="list-item__content">
          <p class="list-item__title">${esc(t.nome)}</p>
          <p class="list-item__subtitle">${formatCurrency(t.valor)} &middot; ${tipoTarifaLabel(t.tipo)}</p>
        </div>
        <div style="display:flex;gap:4px">
          <button class="icon-btn" data-action="edit" data-id="${t.id}" title="Editar">
            <span class="material-symbols-rounded">edit</span>
          </button>
          <button class="icon-btn icon-btn--danger" data-action="delete" data-id="${t.id}" title="Excluir">
            <span class="material-symbols-rounded">delete</span>
          </button>
        </div>
      </div>`).join('')}
  </div>`;

  container.querySelectorAll('[data-action="edit"]').forEach(btn => {
    const tarifa = tarifas.find(t => t.id === btn.dataset.id);
    btn.addEventListener('click', () => openRateModal(tarifa));
  });

  container.querySelectorAll('[data-action="delete"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const ok = await confirmModal({
        title: 'Excluir tarifa',
        message: 'Tem certeza que deseja excluir esta tarifa?',
        confirmLabel: 'Excluir'
      });
      if (!ok) return;
      try {
        await deleteTarifa(btn.dataset.id);
        showToast('Tarifa excluída.', 'success');
      } catch (err) { showToast(err.message, 'error'); }
    });
  });
}

function openRateModal(tarifa = null) {
  const editing = !!tarifa;
  const { close } = openModal({
    title: editing ? 'Editar tarifa' : 'Nova tarifa',
    body: `
      <form class="form-stack" id="modal-rate-form">
        <div class="form-group">
          <label class="form-label">Nome <span>*</span></label>
          <input type="text" class="form-control" id="mr-name"
            placeholder="Ex: Hora padrão"
            value="${esc(tarifa?.nome || '')}" required />
        </div>
        <div class="form-group">
          <label class="form-label">Tipo de cobrança <span>*</span></label>
          <select class="form-control" id="mr-type" required>
            <option value="hora"   ${tarifa?.tipo === 'hora'   ? 'selected' : ''}>Por hora</option>
            <option value="diaria" ${tarifa?.tipo === 'diaria' ? 'selected' : ''}>Diária</option>
            <option value="mensal" ${tarifa?.tipo === 'mensal' ? 'selected' : ''}>Mensal</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Valor (R$) <span>*</span></label>
          <input type="number" class="form-control" id="mr-value"
            placeholder="Ex: 10.00" step="0.01" min="0.01"
            value="${tarifa?.valor ?? ''}" required />
        </div>
      </form>`,
    actions: [
      { label: 'Cancelar', className: 'btn--ghost' },
      {
        label: editing ? 'Salvar' : 'Cadastrar',
        className: 'btn--primary',
        closeOnClick: false,
        onClick: async () => {
          const nome  = document.getElementById('mr-name')?.value.trim();
          const tipo  = document.getElementById('mr-type')?.value;
          const valor = document.getElementById('mr-value')?.value;

          if (!nome || !tipo || !valor) {
            showToast('Preencha todos os campos.', 'warning');
            return;
          }

          try {
            if (editing) {
              await updateTarifa(tarifa.id, { nome, tipo, valor });
              showToast('Tarifa atualizada!', 'success');
            } else {
              await addTarifa({ nome, tipo, valor });
              showToast('Tarifa cadastrada!', 'success');
            }
            close();
          } catch (err) { showToast(err.message, 'error'); }
        }
      }
    ]
  });
}
