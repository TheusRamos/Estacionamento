import { registerUnsub } from '../../app.js';
import { showToast } from '../../components/toast.js';
import { setButtonLoading } from '../../components/loader.js';
import { onVagasChange } from '../../services/vagas.js';
import { onSetoresChange } from '../../services/setores.js';
import { criarReserva } from '../../services/reservas.js';
import { getVeiculosDoUsuario } from '../../services/veiculos.js';
import { esc, tipoVagaLabel } from '../../utils.js';

let allVagas   = [];
let allSetores = [];
let selectedVagaId = null;
let currentSectorFilter = 'all';

export function initClientSpots(user) {
  const container = document.getElementById('spots-map-container');
  const panel     = document.getElementById('reservation-panel');
  const panelClose = document.getElementById('panel-close');
  const btnReserve = document.getElementById('btn-confirm-reserve');
  const vehicleSelect = document.getElementById('panel-vehicle-select');

  // Carrega veículos do usuário para o select
  loadVehicles(user.uid);

  // Listeners de setores (filtro chips)
  const chipsContainer = document.getElementById('sector-filter-chips');
  chipsContainer?.addEventListener('click', e => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    currentSectorFilter = chip.dataset.sector;
    chipsContainer.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    renderSpots();
  });

  // Painel: fechar
  panelClose?.addEventListener('click', closePanel);
  panel?.addEventListener('click', e => { if (e.target === panel) closePanel(); });

  // Reservar
  btnReserve?.addEventListener('click', async () => {
    if (!selectedVagaId) return;
    const veiculoId = vehicleSelect?.value;
    if (!veiculoId) { showToast('Selecione um veículo.', 'warning'); return; }

    setButtonLoading(btnReserve, true);
    try {
      await criarReserva({ usuarioId: user.uid, vagaId: selectedVagaId, veiculoId });
      showToast('Vaga reservada! Você tem 30 minutos para chegar.', 'success', 5000);
      closePanel();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setButtonLoading(btnReserve, false);
    }
  });

  // Realtime vagas
  const unsubVagas = onVagasChange(vagas => {
    allVagas = vagas;
    renderSpots();
  });
  registerUnsub(unsubVagas);

  // Realtime setores (para chips de filtro)
  const unsubSetores = onSetoresChange(setores => {
    allSetores = setores;
    rebuildSectorChips();
    renderSpots();
  });
  registerUnsub(unsubSetores);
}

async function loadVehicles(usuarioId) {
  try {
    const veiculos = await getVeiculosDoUsuario(usuarioId);
    const select = document.getElementById('panel-vehicle-select');
    if (!select) return;
    select.innerHTML = '<option value="">Selecione um veículo</option>';
    veiculos.forEach(v => {
      const opt = document.createElement('option');
      opt.value = v.id;
      opt.textContent = `${esc(v.placa)} — ${esc(v.modelo)} (${esc(v.cor)})`;
      select.appendChild(opt);
    });
  } catch (_) {}
}

function rebuildSectorChips() {
  const container = document.getElementById('sector-filter-chips');
  if (!container) return;
  container.innerHTML = `<button class="chip ${currentSectorFilter === 'all' ? 'active' : ''}" data-sector="all">Todos</button>`;
  allSetores.forEach(s => {
    const chip = document.createElement('button');
    chip.className = `chip ${currentSectorFilter === s.id ? 'active' : ''}`;
    chip.dataset.sector = s.id;
    chip.textContent = s.nome;
    container.appendChild(chip);
  });
}

function renderSpots() {
  const container = document.getElementById('spots-map-container');
  if (!container) return;

  const filtered = currentSectorFilter === 'all'
    ? allVagas
    : allVagas.filter(v => v.setorId === currentSectorFilter);

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="material-symbols-rounded empty-state__icon">local_parking</span>
        <p class="empty-state__title">Nenhuma vaga encontrada</p>
        <p class="empty-state__text">Não há vagas neste setor.</p>
      </div>`;
    return;
  }

  // Agrupa por setor
  const bySetor = {};
  filtered.forEach(v => {
    const key = v.setorId || 'sem-setor';
    if (!bySetor[key]) bySetor[key] = [];
    bySetor[key].push(v);
  });

  container.innerHTML = Object.entries(bySetor).map(([setorId, vagas]) => {
    const setor = allSetores.find(s => s.id === setorId);
    const livres = vagas.filter(v => v.status === 'livre').length;
    return `
      <div class="sector-block">
        <div class="sector-block__header">
          <span class="sector-block__name">${esc(setor?.nome || 'Sem setor')}</span>
          <span class="sector-block__count">${livres} livre${livres !== 1 ? 's' : ''}</span>
        </div>
        <div class="spots-grid">
          ${vagas.map(v => spotCell(v)).join('')}
        </div>
      </div>`;
  }).join('');

  // Event delegation para seleção
  container.querySelectorAll('.spot-cell--livre').forEach(cell => {
    cell.addEventListener('click', () => {
      container.querySelectorAll('.spot-cell').forEach(c => c.classList.remove('spot-cell--selected'));
      cell.classList.add('spot-cell--selected');
      openPanel(cell.dataset.vagaId, cell.dataset.codigo, cell.dataset.setor);
    });
  });
}

function spotCell(v) {
  const setor = allSetores.find(s => s.id === v.setorId);
  return `
    <div class="spot-cell spot-cell--${v.status} ${v.id === selectedVagaId ? 'spot-cell--selected' : ''}"
         data-vaga-id="${v.id}" data-codigo="${esc(v.codigo)}" data-setor="${esc(setor?.nome || '')}">
      <span class="material-symbols-rounded" style="font-size:18px">${spotIcon(v.tipo)}</span>
      <span class="spot-cell__code">${esc(v.codigo)}</span>
      <span class="spot-cell__type">${tipoVagaLabel(v.tipo)}</span>
    </div>`;
}

function spotIcon(tipo) {
  return tipo === 'pcd' ? 'accessible' : tipo === 'preferencial' ? 'elderly' : 'local_parking';
}

function openPanel(vagaId, codigo, setor) {
  selectedVagaId = vagaId;
  document.getElementById('panel-spot-code').textContent = codigo;
  document.getElementById('panel-spot-sector').textContent = setor ? `Setor: ${setor}` : '';
  document.getElementById('reservation-panel').classList.add('visible');
}

function closePanel() {
  selectedVagaId = null;
  document.getElementById('reservation-panel').classList.remove('visible');
  document.querySelectorAll('.spot-cell--selected').forEach(c => c.classList.remove('spot-cell--selected'));
}
