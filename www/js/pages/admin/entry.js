import { showToast } from '../../components/toast.js';
import { openModal } from '../../components/modal.js';
import { setButtonLoading } from '../../components/loader.js';
import { getVagasLivres } from '../../services/vagas.js';
import { getTarifas } from '../../services/tarifas.js';
import { registrarEntrada, registrarSaida, getSessaoEmAndamentoPorPlaca } from '../../services/sessoes.js';
import { registrarPagamento } from '../../services/pagamentos.js';
import { getReservasAtivas, concluirReserva, expirarReserva } from '../../services/reservas.js';
import { esc, formatDateTime, formatCurrency } from '../../utils.js';
import { db } from '../../config/firebase.js';
import {
  collection, doc, addDoc, getDocs, getDoc,
  query, where
} from 'firebase/firestore';

let currentMode       = 'entry';
let activeSessaoFound = null;
let reservaTimers     = [];

export async function initAdminEntry(user) {
  setupModeToggle();
  await Promise.all([loadEntryFormData(), loadReservasCheckin()]);

  document.getElementById('btn-search-plate')?.addEventListener('click', searchByPlate);

  document.getElementById('form-entry')?.addEventListener('submit', async e => {
    e.preventDefault();
    await handleEntry(user);
  });

  document.getElementById('btn-exit-submit')?.addEventListener('click', async e => {
    e.preventDefault();
    await handleExit(user);
  });
}

// ─── Toggle Entrada / Saída ───────────────────────────────────────────

function setupModeToggle() {
  const btnEntry     = document.getElementById('toggle-entry');
  const btnExit      = document.getElementById('toggle-exit');
  const entrySection = document.getElementById('entry-form-section');
  const exitSection  = document.getElementById('exit-form-section');
  const reservasSec  = document.getElementById('reservas-checkin-section');

  btnEntry?.addEventListener('click', () => {
    currentMode = 'entry';
    btnEntry.classList.add('active--entry');
    btnExit.classList.remove('active--exit');
    entrySection.classList.remove('d-none');
    exitSection.classList.add('d-none');
    reservasSec?.classList.remove('hidden-by-mode');
    resetExitForm();
    loadReservasCheckin();
  });

  btnExit?.addEventListener('click', () => {
    currentMode = 'exit';
    btnExit.classList.add('active--exit');
    btnEntry.classList.remove('active--entry');
    exitSection.classList.remove('d-none');
    entrySection.classList.add('d-none');
    reservasSec?.classList.add('hidden-by-mode');
    clearReservaTimers();
  });
}

// ─── Formulário de entrada ────────────────────────────────────────────

async function loadEntryFormData() {
  try {
    const [vagas, tarifas] = await Promise.all([getVagasLivres(), getTarifas()]);

    const spotSelect = document.getElementById('entry-spot');
    if (spotSelect) {
      spotSelect.innerHTML = '<option value="">Selecione uma vaga livre</option>';
      vagas.forEach(v => {
        const opt = document.createElement('option');
        opt.value = v.id;
        opt.textContent = `${esc(v.codigo)} — ${capitalize(v.tipo)}`;
        spotSelect.appendChild(opt);
      });
    }

    const tariffSelect = document.getElementById('entry-tariff');
    if (tariffSelect) {
      tariffSelect.innerHTML = '<option value="">Selecione uma tarifa</option>';
      tarifas.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t.id;
        opt.textContent = `${esc(t.nome)} — ${formatCurrency(t.valor)}/${t.tipo}`;
        tariffSelect.appendChild(opt);
      });
    }
  } catch (_) {
    showToast('Erro ao carregar dados de entrada.', 'error');
  }
}

async function handleEntry(user) {
  const plate    = document.getElementById('entry-plate')?.value.trim().toUpperCase();
  const vagaId   = document.getElementById('entry-spot')?.value;
  const tarifaId = document.getElementById('entry-tariff')?.value;

  if (!plate || !vagaId || !tarifaId) {
    showToast('Preencha todos os campos obrigatórios.', 'warning');
    return;
  }

  const btn = document.getElementById('btn-entry-submit');
  setButtonLoading(btn, true);

  try {
    const veiculoId = await findOrCreateVehicle(plate);
    const usuarioId = await findUserByVehicle(veiculoId) || user.uid;

    await registrarEntrada({ usuarioId, veiculoId, vagaId, tarifaId });
    showToast(`Entrada registrada para ${plate}!`, 'success');
    document.getElementById('form-entry')?.reset();
    await Promise.all([loadEntryFormData(), loadReservasCheckin()]);
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    setButtonLoading(btn, false);
  }
}

// ─── Formulário de saída ──────────────────────────────────────────────

async function searchByPlate() {
  const plate = document.getElementById('exit-plate')?.value.trim().toUpperCase();
  if (!plate) { showToast('Informe a placa do veículo.', 'warning'); return; }

  try {
    const sessao = await getSessaoEmAndamentoPorPlaca(plate);
    if (!sessao) {
      showToast('Nenhuma sessão ativa encontrada para esta placa.', 'warning');
      document.getElementById('exit-session-info')?.classList.add('d-none');
      return;
    }

    activeSessaoFound = sessao;

    const [vagaSnap, tarifas] = await Promise.all([
      fetchDoc('vagas', sessao.vagaId),
      getTarifas()
    ]);
    const tarifa = tarifas.find(t => t.id === sessao.tarifaId);

    const now       = Date.now();
    const entradaMs = sessao.entrada?.toMillis?.() || now;
    const minutos   = Math.round((now - entradaMs) / 60000);

    document.getElementById('exit-info-spot').textContent  = vagaSnap?.codigo || '—';
    document.getElementById('exit-info-entry').textContent = formatDateTime(sessao.entrada);
    document.getElementById('exit-info-time').textContent  = `${Math.floor(minutos / 60)}h ${minutos % 60}min`;

    const custo = tarifa
      ? (tarifa.tipo === 'hora' ? Math.ceil(minutos / 60) * tarifa.valor : tarifa.valor)
      : 0;
    document.getElementById('exit-info-cost').textContent = formatCurrency(custo);
    document.getElementById('exit-session-info')?.classList.remove('d-none');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleExit(user) {
  if (!activeSessaoFound) { showToast('Busque uma sessão ativa primeiro.', 'warning'); return; }

  const metodo = document.getElementById('exit-payment-method')?.value;
  if (!metodo) { showToast('Selecione a forma de pagamento.', 'warning'); return; }

  const btn = document.getElementById('btn-exit-submit');
  setButtonLoading(btn, true);

  try {
    const tarifas = await getTarifas();
    const tarifa  = tarifas.find(t => t.id === activeSessaoFound.tarifaId) || null;
    const { valor } = await registrarSaida(activeSessaoFound.id, tarifa);

    await registrarPagamento({
      sessaoId:  activeSessaoFound.id,
      usuarioId: activeSessaoFound.usuarioId,
      valor,
      metodo
    });

    showToast(`Saída registrada! Total: ${formatCurrency(valor)}`, 'success', 5000);
    resetExitForm();
    await loadEntryFormData();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    setButtonLoading(btn, false);
  }
}

function resetExitForm() {
  activeSessaoFound = null;
  const plate = document.getElementById('exit-plate');
  if (plate) plate.value = '';
  document.getElementById('exit-session-info')?.classList.add('d-none');
  const pm = document.getElementById('exit-payment-method');
  if (pm) pm.value = '';
}

// ─── Reservas — check-in ──────────────────────────────────────────────

function clearReservaTimers() {
  reservaTimers.forEach(clearInterval);
  reservaTimers = [];
}

async function loadReservasCheckin() {
  clearReservaTimers();

  const section = document.getElementById('reservas-checkin-section');
  const list    = document.getElementById('reservas-checkin-list');
  if (!section || !list) return;

  // Não mostra na aba de saída
  if (section.classList.contains('hidden-by-mode')) return;

  try {
    const reservas = await getReservasAtivas();

    if (!reservas.length) {
      section.classList.add('d-none');
      return;
    }

    // Enriquece com dados de veículo, vaga e usuário em paralelo
    const enriched = await Promise.all(reservas.map(async r => {
      const [veiculo, vaga, usuario] = await Promise.all([
        fetchDoc('veiculos', r.veiculoId),
        fetchDoc('vagas',    r.vagaId),
        fetchDoc('usuarios', r.usuarioId)
      ]);
      return { ...r, veiculo, vaga, usuario };
    }));

    // Auto-expira reservas cujo tempo passou
    const agora = Date.now();
    const expiradas = enriched.filter(r => (r.expiraEm?.toMillis?.() ?? 0) < agora);
    if (expiradas.length) {
      await Promise.all(expiradas.map(r => expirarReserva(r.id, r.vagaId)));
    }

    const ativas = enriched.filter(r => (r.expiraEm?.toMillis?.() ?? 0) >= agora);

    if (!ativas.length) {
      section.classList.add('d-none');
      return;
    }

    section.classList.remove('d-none');
    list.innerHTML = ativas.map(reservaRow).join('');

    // Wiring dos botões de check-in
    ativas.forEach(r => {
      list.querySelector(`[data-action="checkin"][data-id="${r.id}"]`)
        ?.addEventListener('click', () => checkInReserva(r));

      // Countdown
      const timerEl = document.getElementById(`countdown-${r.id}`);
      if (!timerEl) return;

      const tick = () => {
        const ms = (r.expiraEm?.toMillis?.() ?? 0) - Date.now();
        if (ms <= 0) {
          timerEl.textContent = 'Expirou';
          timerEl.className   = 'countdown text-danger';
          return;
        }
        const min = Math.floor(ms / 60000);
        const sec = Math.floor((ms % 60000) / 1000);
        timerEl.textContent = `${min}:${String(sec).padStart(2, '0')}`;
        timerEl.className   = `countdown ${ms < 5 * 60 * 1000 ? 'text-warning' : 'text-success'}`;
      };

      tick();
      reservaTimers.push(setInterval(tick, 1000));
    });

  } catch (err) {
    section.classList.add('d-none');
  }
}

function reservaRow(r) {
  const plate = r.veiculo?.placa                  || '—';
  const spot  = r.vaga?.codigo                    || '—';
  const user  = r.usuario?.nome || r.usuario?.email || 'Visitante';

  return `
    <div class="list-item">
      <div class="list-item__icon" style="background:var(--color-warning-surface);color:var(--color-warning)">
        <span class="material-symbols-rounded">bookmark</span>
      </div>
      <div class="list-item__content">
        <div class="d-flex align-center gap-2 flex-wrap">
          <p class="list-item__title">${esc(plate)}</p>
          <span class="chip chip--sm">${esc(spot)}</span>
        </div>
        <p class="list-item__subtitle">${esc(user)}</p>
      </div>
      <div style="text-align:right;flex-shrink:0">
        <div id="countdown-${r.id}" class="countdown text-success">—:——</div>
        <button class="btn btn--primary btn--sm mt-2" data-action="checkin" data-id="${r.id}">
          <span class="material-symbols-rounded" style="font-size:16px">login</span>
          Check-in
        </button>
      </div>
    </div>`;
}

async function checkInReserva(reserva) {
  let tarifas;
  try {
    tarifas = await getTarifas();
  } catch {
    showToast('Erro ao carregar tarifas.', 'error');
    return;
  }

  if (!tarifas.length) {
    showToast('Cadastre ao menos uma tarifa antes de fazer check-in.', 'warning');
    return;
  }

  const opts = tarifas.map(t =>
    `<option value="${t.id}">${esc(t.nome)} — ${formatCurrency(t.valor)}/${t.tipo}</option>`
  ).join('');

  let modalRef;
  modalRef = openModal({
    title: 'Check-in da Reserva',
    body: `
      <div class="card mb-4" style="border:1.5px solid var(--color-warning)">
        <div class="card__body card__body--compact">
          <div class="d-flex justify-between mb-2">
            <span class="text-muted text-sm">Placa</span>
            <span class="text-bold">${esc(reserva.veiculo?.placa || '—')}</span>
          </div>
          <div class="d-flex justify-between mb-2">
            <span class="text-muted text-sm">Vaga</span>
            <span class="text-bold">${esc(reserva.vaga?.codigo || '—')}</span>
          </div>
          <div class="d-flex justify-between">
            <span class="text-muted text-sm">Cliente</span>
            <span class="text-bold">${esc(reserva.usuario?.nome || reserva.usuario?.email || 'Visitante')}</span>
          </div>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Tarifa <span>*</span></label>
        <select class="form-control" id="checkin-tariff">
          <option value="">Selecione uma tarifa</option>
          ${opts}
        </select>
      </div>`,
    actions: [
      { label: 'Cancelar', className: 'btn--ghost' },
      {
        label: 'Confirmar Check-in',
        className: 'btn--success',
        closeOnClick: false,
        onClick: async () => {
          const tarifaId = document.getElementById('checkin-tariff')?.value;
          if (!tarifaId) { showToast('Selecione uma tarifa.', 'warning'); return; }

          try {
            await concluirReserva(reserva.id);
            await registrarEntrada({
              usuarioId: reserva.usuarioId,
              veiculoId: reserva.veiculoId,
              vagaId:    reserva.vagaId,
              tarifaId
            });
            showToast(`Check-in realizado! Vaga ${esc(reserva.vaga?.codigo || '')} ocupada.`, 'success');
            modalRef.close();
            await Promise.all([loadReservasCheckin(), loadEntryFormData()]);
          } catch (err) {
            showToast(err.message, 'error');
          }
        }
      }
    ]
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────

async function findOrCreateVehicle(plate) {
  const q = query(collection(db, 'veiculos'), where('placa', '==', plate));
  const snap = await getDocs(q);
  if (!snap.empty) return snap.docs[0].id;

  const ref = await addDoc(collection(db, 'veiculos'), {
    placa: plate,
    modelo: 'Não identificado',
    cor: '—',
    usuarioId: null
  });
  return ref.id;
}

async function findUserByVehicle(veiculoId) {
  const snap = await getDoc(doc(db, 'veiculos', veiculoId));
  return snap.exists() ? snap.data().usuarioId : null;
}

async function fetchDoc(col, id) {
  if (!id) return null;
  const snap = await getDoc(doc(db, col, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

function capitalize(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
