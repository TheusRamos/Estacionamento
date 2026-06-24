import { db } from '../../config/firebase.js';
import { collection, getDocs, query, where } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { getClientes } from '../../services/auth.js';
import { showToast } from '../../components/toast.js';
import { openModal } from '../../components/modal.js';
import { esc, formatDateTime, formatCurrency } from '../../utils.js';

let allClients = [];
let searchTerm  = '';

export async function initAdminClients(user) {
  const container = document.getElementById('clients-list');
  const statsEl   = document.getElementById('clients-stats');
  const searchEl  = document.getElementById('clients-search');

  setLoading(container);

  try {
    await loadAllData();
  } catch (err) {
    showToast('Erro ao carregar clientes: ' + err.message, 'error');
    container.innerHTML = `<div class="empty-state"><p class="text-danger">Erro ao carregar dados.</p></div>`;
    return;
  }

  renderStats(statsEl);
  renderList(container);

  searchEl?.addEventListener('input', e => {
    searchTerm = e.target.value.toLowerCase().trim();
    renderList(container);
  });
}

// ─── Data loading ─────────────────────────────────────────────────────

async function loadAllData() {
  const [clientesRaw, veiculosSnap, sessoesSnap, reservasSnap] = await Promise.all([
    getClientes(),
    getDocs(collection(db, 'veiculos')),
    getDocs(collection(db, 'sessoes')),
    getDocs(query(collection(db, 'reservas'), where('status', '==', 'ativa')))
  ]);

  const veiculosMap = {};
  veiculosSnap.forEach(d => {
    const v = { id: d.id, ...d.data() };
    if (!veiculosMap[v.usuarioId]) veiculosMap[v.usuarioId] = [];
    veiculosMap[v.usuarioId].push(v);
  });

  const sessoesMap = {};
  sessoesSnap.forEach(d => {
    const s = { id: d.id, ...d.data() };
    if (!s.usuarioId) return;
    if (!sessoesMap[s.usuarioId]) sessoesMap[s.usuarioId] = { total: 0, ativa: false, docs: [] };
    sessoesMap[s.usuarioId].total++;
    if (s.status === 'em andamento') sessoesMap[s.usuarioId].ativa = true;
    sessoesMap[s.usuarioId].docs.push(s);
  });

  const reservasAtivas = new Set(reservasSnap.docs.map(d => d.data().usuarioId));

  allClients = clientesRaw.map(c => ({
    ...c,
    veiculos:    veiculosMap[c.uid]   || [],
    sessoes:     sessoesMap[c.uid]    || { total: 0, ativa: false, docs: [] },
    reservaAtiva: reservasAtivas.has(c.uid)
  }));
}

// ─── Stats ────────────────────────────────────────────────────────────

function renderStats(el) {
  if (!el) return;
  const comSessaoAtiva   = allClients.filter(c => c.sessoes.ativa).length;
  const comReservaAtiva  = allClients.filter(c => c.reservaAtiva).length;
  const totalVeiculos    = allClients.reduce((s, c) => s + c.veiculos.length, 0);

  el.innerHTML = `
    <div class="stat-card">
      <div class="stat-card__icon" style="background:var(--color-primary-surface);color:var(--color-primary)">
        <span class="material-symbols-rounded">people</span>
      </div>
      <div class="stat-card__value">${allClients.length}</div>
      <div class="stat-card__label">Clientes cadastrados</div>
    </div>
    <div class="stat-card">
      <div class="stat-card__icon" style="background:var(--color-success-surface);color:var(--color-success)">
        <span class="material-symbols-rounded">directions_car</span>
      </div>
      <div class="stat-card__value">${comSessaoAtiva}</div>
      <div class="stat-card__label">No estacionamento agora</div>
    </div>
    <div class="stat-card">
      <div class="stat-card__icon" style="background:var(--color-warning-surface);color:var(--color-warning)">
        <span class="material-symbols-rounded">bookmark</span>
      </div>
      <div class="stat-card__value">${comReservaAtiva}</div>
      <div class="stat-card__label">Com reserva ativa</div>
    </div>
    <div class="stat-card">
      <div class="stat-card__icon" style="background:var(--color-info-surface);color:var(--color-info)">
        <span class="material-symbols-rounded">directions_car</span>
      </div>
      <div class="stat-card__value">${totalVeiculos}</div>
      <div class="stat-card__label">Veículos registrados</div>
    </div>`;
}

// ─── List ─────────────────────────────────────────────────────────────

function renderList(container) {
  const filtered = searchTerm
    ? allClients.filter(c =>
        (c.nome    || '').toLowerCase().includes(searchTerm) ||
        (c.email   || '').toLowerCase().includes(searchTerm) ||
        (c.telefone|| '').includes(searchTerm)
      )
    : allClients;

  if (!filtered.length) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="material-symbols-rounded empty-state__icon">people</span>
        <p class="empty-state__title">${searchTerm ? 'Nenhum resultado' : 'Nenhum cliente cadastrado'}</p>
        <p class="empty-state__text">${searchTerm ? 'Tente outro nome, e-mail ou telefone.' : 'Os clientes aparecerão aqui conforme se cadastrarem.'}</p>
      </div>`;
    return;
  }

  // Ordena: sessão ativa primeiro, depois reserva, depois alfabético
  const sorted = [...filtered].sort((a, b) => {
    if (a.sessoes.ativa !== b.sessoes.ativa) return a.sessoes.ativa ? -1 : 1;
    if (a.reservaAtiva  !== b.reservaAtiva)  return a.reservaAtiva  ? -1 : 1;
    return (a.nome || '').localeCompare(b.nome || '');
  });

  container.innerHTML = `<div class="card">${sorted.map(clientRow).join('')}</div>`;

  container.querySelectorAll('[data-action="view-client"]').forEach(btn => {
    const cliente = allClients.find(c => c.uid === btn.dataset.uid);
    if (cliente) btn.addEventListener('click', () => openClientModal(cliente));
  });
}

function clientRow(c) {
  const initial = (c.nome || c.email || '?')[0].toUpperCase();
  const badges  = [
    c.sessoes.ativa   ? `<span class="badge badge--success">Estacionado agora</span>` : '',
    c.reservaAtiva    ? `<span class="badge badge--warning">Reserva ativa</span>`      : '',
  ].filter(Boolean).join('');

  return `
    <div class="list-item list-item--stacked">
      <div class="avatar avatar--lg" style="flex-shrink:0">${esc(initial)}</div>
      <div class="list-item__content" style="min-width:0">
        <div class="d-flex align-center gap-2 flex-wrap">
          <p class="list-item__title">${esc(c.nome || '—')}</p>
          ${badges}
        </div>
        <p class="list-item__subtitle">${esc(c.email || '—')}</p>
        <p class="list-item__subtitle">${esc(c.telefone || '—')}</p>
        <div class="d-flex gap-2 mt-1">
          <span class="chip chip--sm">
            <span class="material-symbols-rounded" style="font-size:13px">directions_car</span>
            ${c.veiculos.length} veículo${c.veiculos.length !== 1 ? 's' : ''}
          </span>
          <span class="chip chip--sm">
            <span class="material-symbols-rounded" style="font-size:13px">receipt_long</span>
            ${c.sessoes.total} sessão${c.sessoes.total !== 1 ? 'ões' : ''}
          </span>
        </div>
      </div>
      <button class="icon-btn" data-action="view-client" data-uid="${c.uid}" title="Ver detalhes">
        <span class="material-symbols-rounded">open_in_new</span>
      </button>
    </div>`;
}

// ─── Modal de detalhes ────────────────────────────────────────────────

function openClientModal(c) {
  const sessoes = [...c.sessoes.docs]
    .sort((a, b) => (b.entrada?.toMillis?.() ?? 0) - (a.entrada?.toMillis?.() ?? 0))
    .slice(0, 10);

  const veiculosHtml = c.veiculos.length
    ? c.veiculos.map(v => `
        <div class="list-item">
          <div class="list-item__icon" style="background:var(--color-primary-surface);color:var(--color-primary)">
            <span class="material-symbols-rounded">directions_car</span>
          </div>
          <div class="list-item__content">
            <p class="list-item__title">${esc(v.placa)}</p>
            <p class="list-item__subtitle">${esc(v.modelo)} &middot; ${esc(v.cor)}</p>
          </div>
        </div>`).join('')
    : `<p class="text-muted text-sm" style="padding:var(--space-4)">Nenhum veículo cadastrado.</p>`;

  const sessoesHtml = sessoes.length
    ? sessoes.map(s => {
        const durMs = s.saida && s.entrada
          ? s.saida.toMillis() - s.entrada.toMillis()
          : null;
        return `
          <div class="list-item">
            <div class="list-item__content">
              <div class="d-flex align-center justify-between">
                <p class="list-item__title text-sm">${formatDateTime(s.entrada)}</p>
                <span class="badge badge--${s.status === 'em andamento' ? 'success' : 'default'}">${esc(s.status)}</span>
              </div>
              <p class="list-item__subtitle">
                ${durMs ? `${Math.round(durMs / 60000)} min &middot; ` : ''}${formatCurrency(s.valor)}
              </p>
            </div>
          </div>`;
      }).join('')
    : `<p class="text-muted text-sm" style="padding:var(--space-4)">Nenhuma sessão registrada.</p>`;

  openModal({
    title: c.nome || c.email || 'Cliente',
    body: `
      <div style="display:flex;align-items:center;gap:var(--space-4);margin-bottom:var(--space-4)">
        <div class="avatar avatar--xl">${(c.nome || c.email || '?')[0].toUpperCase()}</div>
        <div>
          <p style="font-weight:var(--font-weight-bold);color:var(--color-primary)">${esc(c.nome || '—')}</p>
          <p class="text-sm text-muted">${esc(c.email || '—')}</p>
          <p class="text-sm text-muted">${esc(c.telefone || '—')}</p>
        </div>
      </div>
      <div class="section-header mb-2">
        <h3 class="section-title" style="font-size:var(--font-size-sm)">Veículos</h3>
      </div>
      <div class="card mb-4">${veiculosHtml}</div>
      <div class="section-header mb-2">
        <h3 class="section-title" style="font-size:var(--font-size-sm)">Últimas sessões</h3>
      </div>
      <div class="card">${sessoesHtml}</div>`,
    actions: [{ label: 'Fechar', className: 'btn--ghost' }]
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────

function setLoading(container) {
  container.innerHTML = `
    <div class="empty-state">
      <div class="spinner"></div>
      <p class="text-muted mt-3">Carregando clientes…</p>
    </div>`;
}
