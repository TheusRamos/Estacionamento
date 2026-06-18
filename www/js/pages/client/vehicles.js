import { registerUnsub } from '../../unsubs.js';
import { showToast } from '../../components/toast.js';
import { setButtonLoading } from '../../components/loader.js';
import { openModal, confirmModal } from '../../components/modal.js';
import { onVeiculosChange, addVeiculo, updateVeiculo, deleteVeiculo } from '../../services/veiculos.js';
import { esc } from '../../utils.js';

const PLATE_RE = /^[A-Z]{3}[-]?\d{3}[A-Z0-9]$/;

export function initClientVehicles(user) {
  document.getElementById('btn-add-vehicle')?.addEventListener('click', () => openVehicleModal(user.uid));
  document.getElementById('btn-add-vehicle-empty')?.addEventListener('click', () => openVehicleModal(user.uid));

  const unsub = onVeiculosChange(user.uid, veiculos => {
    renderVehicles(veiculos, user.uid);
  });
  registerUnsub(unsub);
}

function renderVehicles(veiculos, usuarioId) {
  const container = document.getElementById('vehicles-list');
  if (!container) return;

  if (veiculos.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="material-symbols-rounded empty-state__icon">directions_car</span>
        <p class="empty-state__title">Nenhum veículo</p>
        <p class="empty-state__text">Cadastre seu veículo para reservar vagas e acompanhar sessões.</p>
        <button class="btn btn--primary mt-4" id="btn-add-vehicle-empty-inner">
          <span class="material-symbols-rounded">add</span>
          Adicionar veículo
        </button>
      </div>`;
    document.getElementById('btn-add-vehicle-empty-inner')?.addEventListener('click', () => openVehicleModal(usuarioId));
    return;
  }

  container.innerHTML = `<div class="card">
    ${veiculos.map(v => `
      <div class="list-item">
        <div class="list-item__icon" style="background:var(--color-primary-surface);color:var(--color-primary)">
          <span class="material-symbols-rounded">directions_car</span>
        </div>
        <div class="list-item__content">
          <p class="list-item__title">${esc(v.placa)}</p>
          <p class="list-item__subtitle">${esc(v.modelo)} &middot; ${esc(v.cor)}</p>
        </div>
        <div style="display:flex;gap:4px">
          <button class="icon-btn" data-action="edit" data-id="${v.id}" title="Editar">
            <span class="material-symbols-rounded">edit</span>
          </button>
          <button class="icon-btn icon-btn--danger" data-action="delete" data-id="${v.id}" title="Excluir">
            <span class="material-symbols-rounded">delete</span>
          </button>
        </div>
      </div>`).join('')}
  </div>`;

  container.querySelectorAll('[data-action="edit"]').forEach(btn => {
    const veiculo = veiculos.find(v => v.id === btn.dataset.id);
    btn.addEventListener('click', () => openVehicleModal(usuarioId, veiculo));
  });

  container.querySelectorAll('[data-action="delete"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const ok = await confirmModal({
        title: 'Excluir veículo',
        message: 'Tem certeza que deseja excluir este veículo? Esta ação não pode ser desfeita.',
        confirmLabel: 'Excluir'
      });
      if (!ok) return;
      try {
        await deleteVeiculo(btn.dataset.id);
        showToast('Veículo excluído.', 'success');
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  });
}

function openVehicleModal(usuarioId, veiculo = null) {
  const editing = !!veiculo;
  const title   = editing ? 'Editar veículo' : 'Novo veículo';

  const { close } = openModal({
    title,
    body: `
      <form class="form-stack" id="modal-vehicle-form" novalidate>
        <div class="form-group">
          <label class="form-label">Placa <span>*</span></label>
          <input type="text" class="form-control" id="mv-plate"
            placeholder="AAA-0000 ou AAA0A00"
            maxlength="8"
            style="text-transform:uppercase"
            value="${esc(veiculo?.placa || '')}"
            ${editing ? 'readonly' : ''} required />
        </div>
        <div class="form-group">
          <label class="form-label">Modelo <span>*</span></label>
          <input type="text" class="form-control" id="mv-model"
            placeholder="Ex: Honda Civic"
            value="${esc(veiculo?.modelo || '')}" required />
        </div>
        <div class="form-group">
          <label class="form-label">Cor <span>*</span></label>
          <input type="text" class="form-control" id="mv-color"
            placeholder="Ex: Prata"
            value="${esc(veiculo?.cor || '')}" required />
        </div>
      </form>`,
    actions: [
      { label: 'Cancelar', className: 'btn--ghost', onClick: () => {} },
      {
        label: editing ? 'Salvar' : 'Cadastrar',
        className: 'btn--primary',
        closeOnClick: false,
        onClick: async () => {
          const placa  = document.getElementById('mv-plate')?.value.trim().toUpperCase();
          const modelo = document.getElementById('mv-model')?.value.trim();
          const cor    = document.getElementById('mv-color')?.value.trim();

          if (!placa || !modelo || !cor) {
            showToast('Preencha todos os campos.', 'warning');
            return;
          }

          const plateFmt = placa.replace(/[^A-Z0-9]/g, '');
          if (!PLATE_RE.test(plateFmt) && plateFmt.length !== 7) {
            showToast('Placa inválida. Use o formato AAA-0000 ou AAA0A00.', 'warning');
            return;
          }

          try {
            if (editing) {
              await updateVeiculo(veiculo.id, { modelo, cor });
              showToast('Veículo atualizado!', 'success');
            } else {
              await addVeiculo(usuarioId, { placa, modelo, cor });
              showToast('Veículo cadastrado!', 'success');
            }
            close();
          } catch (err) {
            showToast(err.message, 'error');
          }
        }
      }
    ]
  });
}
