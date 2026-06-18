import { showToast } from '../../components/toast.js';
import { openModal, confirmModal } from '../../components/modal.js';
import { registerUnsub } from '../../unsubs.js';
import { onSetoresChange, addSetor, updateSetor, deleteSetor } from '../../services/setores.js';
import { onVagasChange, addVaga, updateVaga, deleteVaga } from '../../services/vagas.js';
import { esc, tipoVagaLabel } from '../../utils.js';

let allSetores = [];
let allVagas   = [];
let unsubSectors = null;
let unsubSpots   = null;

export function initAdminSectors(user) {
  // Limpa listeners anteriores se re-inicializou
  if (unsubSectors) unsubSectors();
  if (unsubSpots)   unsubSpots();

  document.getElementById('btn-add-sector')?.addEventListener('click', () => openSectorModal());
  document.getElementById('btn-add-sector-empty')?.addEventListener('click', () => openSectorModal());
  document.getElementById('btn-seed-matrix')?.addEventListener('click', gerarMatrizPadrao);

  unsubSectors = onSetoresChange(setores => {
    allSetores = setores;
    render();
  });
  registerUnsub(unsubSectors);

  unsubSpots = onVagasChange(vagas => {
    allVagas = vagas;
    render();
  });
  registerUnsub(unsubSpots);
}

function render() {
  const container = document.getElementById('sectors-list');
  if (!container) return;

  if (!allSetores.length) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="material-symbols-rounded empty-state__icon">grid_view</span>
        <p class="empty-state__title">Nenhum setor cadastrado</p>
        <p class="empty-state__text">Crie setores manualmente ou gere a matriz padrão de 3 fileiras × 16 vagas.</p>
        <div style="display:flex;gap:var(--space-3);flex-wrap:wrap;justify-content:center;margin-top:var(--space-5)">
          <button class="btn btn--secondary" id="btn-add-sector-empty-inner">
            <span class="material-symbols-rounded">add</span>
            Novo setor
          </button>
          <button class="btn btn--primary" id="btn-seed-matrix-empty">
            <span class="material-symbols-rounded">auto_awesome</span>
            Gerar matriz padrão
          </button>
        </div>
      </div>`;
    document.getElementById('btn-add-sector-empty-inner')?.addEventListener('click', () => openSectorModal());
    document.getElementById('btn-seed-matrix-empty')?.addEventListener('click', gerarMatrizPadrao);
    return;
  }

  container.innerHTML = allSetores.map(setor => {
    const vagas = allVagas.filter(v => v.setorId === setor.id);
    const livres = vagas.filter(v => v.status === 'livre').length;
    return `
      <div class="card mb-4" data-setor-id="${setor.id}">
        <div class="card__header">
          <div>
            <p class="card__title">${esc(setor.nome)}</p>
            <p class="text-sm text-muted mt-1">${vagas.length} vagas &middot; ${livres} livre${livres !== 1 ? 's' : ''}</p>
          </div>
          <div style="display:flex;gap:4px">
            <button class="icon-btn" data-action="edit-sector" data-id="${setor.id}" title="Editar setor">
              <span class="material-symbols-rounded">edit</span>
            </button>
            <button class="icon-btn icon-btn--danger" data-action="delete-sector" data-id="${setor.id}" title="Excluir setor">
              <span class="material-symbols-rounded">delete</span>
            </button>
          </div>
        </div>
        <div class="card__body card__body--compact">
          ${vagas.length ? `
            <div class="spots-grid mb-3">
              ${vagas.map(v => `
                <div class="spot-cell spot-cell--${v.status}" style="cursor:pointer"
                     data-action="edit-spot" data-id="${v.id}" data-setor="${setor.id}">
                  <span class="spot-cell__code">${esc(v.codigo)}</span>
                  <span class="spot-cell__type">${tipoVagaLabel(v.tipo)}</span>
                </div>`).join('')}
            </div>` : ''}
          <button class="btn btn--secondary btn--sm w-full" data-action="add-spot" data-setor="${setor.id}" data-setor-nome="${esc(setor.nome)}">
            <span class="material-symbols-rounded">add</span>
            Adicionar vaga
          </button>
        </div>
      </div>`;
  }).join('');

  // Bind events
  container.querySelectorAll('[data-action="edit-sector"]').forEach(btn => {
    const setor = allSetores.find(s => s.id === btn.dataset.id);
    btn.addEventListener('click', () => openSectorModal(setor));
  });

  container.querySelectorAll('[data-action="delete-sector"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const hasVagas = allVagas.some(v => v.setorId === btn.dataset.id);
      if (hasVagas) {
        showToast('Remova todas as vagas do setor antes de excluí-lo.', 'warning');
        return;
      }
      const ok = await confirmModal({ title: 'Excluir setor', message: 'Tem certeza?', confirmLabel: 'Excluir' });
      if (!ok) return;
      try { await deleteSetor(btn.dataset.id); showToast('Setor excluído.', 'success'); }
      catch (err) { showToast(err.message, 'error'); }
    });
  });

  container.querySelectorAll('[data-action="add-spot"]').forEach(btn => {
    btn.addEventListener('click', () => openSpotModal(btn.dataset.setor, btn.dataset.setorNome));
  });

  container.querySelectorAll('[data-action="edit-spot"]').forEach(btn => {
    const vaga = allVagas.find(v => v.id === btn.dataset.id);
    if (!vaga) return;
    const setor = allSetores.find(s => s.id === vaga.setorId);
    btn.addEventListener('click', () => openSpotModal(vaga.setorId, setor?.nome || '', vaga));
  });
}

// ─── Gerar Matriz Padrão ─────────────────────────────────────────────

async function gerarMatrizPadrao() {
  if (allSetores.length > 0) {
    showToast('Já existem setores cadastrados. Exclua todos antes de gerar a matriz padrão.', 'warning');
    return;
  }

  const ok = await confirmModal({
    title: 'Gerar matriz padrão',
    message: 'Serão criados 3 setores (Fileira A, B e C) com 16 vagas cada, totalizando 48 vagas. Continuar?',
    confirmLabel: 'Gerar',
    confirmClass: 'btn--primary'
  });
  if (!ok) return;

  const btn = document.getElementById('btn-seed-matrix');
  if (btn) btn.disabled = true;
  showToast('Gerando matriz padrão… Aguarde.', 'info', 15000);

  try {
    const fileiras = [
      { nome: 'Fileira A', letra: 'A' },
      { nome: 'Fileira B', letra: 'B' },
      { nome: 'Fileira C', letra: 'C' },
    ];

    for (const { nome, letra } of fileiras) {
      const setorRef = await addSetor({ nome, totalVagas: 16 });
      const vagaPromises = [];
      for (let n = 1; n <= 16; n++) {
        const codigo = `${letra}-${String(n).padStart(2, '0')}`;
        vagaPromises.push(addVaga({ codigo, setorId: setorRef.id, tipo: 'comum' }));
      }
      await Promise.all(vagaPromises);
    }

    showToast('Matriz padrão criada! 3 setores × 16 vagas = 48 vagas.', 'success', 5000);
  } catch (err) {
    showToast('Erro ao gerar matriz: ' + err.message, 'error');
  } finally {
    if (btn) btn.disabled = false;
  }
}

// ─── Modal Setor ─────────────────────────────────────────────────────

function openSectorModal(setor = null) {
  const editing = !!setor;
  const { close } = openModal({
    title: editing ? 'Editar setor' : 'Novo setor',
    body: `
      <form class="form-stack" id="modal-sector-form">
        <div class="form-group">
          <label class="form-label">Nome do setor <span>*</span></label>
          <input type="text" class="form-control" id="ms-name"
            placeholder="Ex: Bloco A" value="${esc(setor?.nome || '')}" required />
        </div>
        <div class="form-group">
          <label class="form-label">Total de vagas previsto</label>
          <input type="number" class="form-control" id="ms-total"
            placeholder="Ex: 20" min="0" value="${setor?.totalVagas ?? ''}" />
        </div>
      </form>`,
    actions: [
      { label: 'Cancelar', className: 'btn--ghost' },
      {
        label: editing ? 'Salvar' : 'Criar',
        className: 'btn--primary',
        closeOnClick: false,
        onClick: async () => {
          const nome       = document.getElementById('ms-name')?.value.trim();
          const totalVagas = document.getElementById('ms-total')?.value;
          if (!nome) { showToast('Informe o nome do setor.', 'warning'); return; }
          try {
            if (editing) {
              await updateSetor(setor.id, { nome, totalVagas: totalVagas || 0 });
              showToast('Setor atualizado!', 'success');
            } else {
              await addSetor({ nome, totalVagas: totalVagas || 0 });
              showToast('Setor criado!', 'success');
            }
            close();
          } catch (err) { showToast(err.message, 'error'); }
        }
      }
    ]
  });
}

// ─── Modal Vaga ───────────────────────────────────────────────────────

function openSpotModal(setorId, setorNome, vaga = null) {
  const editing = !!vaga;
  const { close } = openModal({
    title: editing ? 'Editar vaga' : `Nova vaga — ${esc(setorNome)}`,
    body: `
      <form class="form-stack" id="modal-spot-form">
        <div class="form-group">
          <label class="form-label">Código da vaga <span>*</span></label>
          <input type="text" class="form-control" id="mvg-code"
            placeholder="Ex: A-01" style="text-transform:uppercase"
            value="${esc(vaga?.codigo || '')}" ${editing ? 'readonly' : ''} required />
        </div>
        <div class="form-group">
          <label class="form-label">Tipo <span>*</span></label>
          <select class="form-control" id="mvg-type" required>
            <option value="comum"       ${vaga?.tipo === 'comum'       ? 'selected' : ''}>Comum</option>
            <option value="pcd"         ${vaga?.tipo === 'pcd'         ? 'selected' : ''}>PCD</option>
            <option value="preferencial"${vaga?.tipo === 'preferencial'? 'selected' : ''}>Preferencial</option>
          </select>
        </div>
        ${editing ? `
        <div class="form-group">
          <label class="form-label">Status</label>
          <select class="form-control" id="mvg-status">
            <option value="livre"      ${vaga?.status === 'livre'      ? 'selected' : ''}>Livre</option>
            <option value="manutencao" ${vaga?.status === 'manutencao' ? 'selected' : ''}>Manutenção</option>
          </select>
        </div>` : ''}
      </form>`,
    actions: [
      { label: 'Cancelar', className: 'btn--ghost' },
      {
        label: editing ? 'Salvar' : 'Adicionar',
        className: 'btn--primary',
        closeOnClick: false,
        onClick: async () => {
          const codigo = document.getElementById('mvg-code')?.value.trim().toUpperCase();
          const tipo   = document.getElementById('mvg-type')?.value;
          if (!codigo || !tipo) { showToast('Preencha todos os campos.', 'warning'); return; }
          try {
            if (editing) {
              const status = document.getElementById('mvg-status')?.value;
              // Não permite mudar status de ocupada/reservada manualmente
              if (vaga.status === 'ocupada' || vaga.status === 'reservada') {
                showToast('Não é possível alterar o status de uma vaga ocupada ou reservada.', 'warning');
                return;
              }
              await updateVaga(vaga.id, { tipo, ...(status ? { status } : {}) });
              showToast('Vaga atualizada!', 'success');
            } else {
              await addVaga({ codigo, setorId, tipo });
              showToast('Vaga adicionada!', 'success');
            }
            close();
          } catch (err) { showToast(err.message, 'error'); }
        }
      }
    ]
  });
}
