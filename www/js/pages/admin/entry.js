import { showToast } from '../../components/toast.js';
import { setButtonLoading } from '../../components/loader.js';
import { getVagasLivres } from '../../services/vagas.js';
import { getTarifas } from '../../services/tarifas.js';
import { registrarEntrada, registrarSaida, getSessaoEmAndamentoPorPlaca } from '../../services/sessoes.js';
import { registrarPagamento } from '../../services/pagamentos.js';
import { esc, formatDateTime, formatCurrency } from '../../utils.js';
import { db } from '../../config/firebase.js';
import {
  collection, doc, addDoc, getDocs, getDoc,
  query, where
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

let currentMode = 'entry';
let activeSessaoFound = null;

export function initAdminEntry(user) {
  setupModeToggle();
  loadEntryFormData();

  document.getElementById('btn-search-plate')?.addEventListener('click', searchByPlate);

  document.getElementById('form-entry')?.addEventListener('submit', async e => {
    e.preventDefault();
    await handleEntry(user);
  });

  document.getElementById('btn-exit-submit')?.addEventListener('click', async e => {
    e.preventDefault();
    await handleExit(user);
  });

  document.querySelector('[data-tab="admin-entry"]')?.addEventListener('click', loadEntryFormData);
}

function setupModeToggle() {
  const btnEntry     = document.getElementById('toggle-entry');
  const btnExit      = document.getElementById('toggle-exit');
  const entrySection = document.getElementById('entry-form-section');
  const exitSection  = document.getElementById('exit-form-section');

  btnEntry?.addEventListener('click', () => {
    currentMode = 'entry';
    btnEntry.classList.add('active--entry');
    btnExit.classList.remove('active--exit');
    entrySection.classList.remove('d-none');
    exitSection.classList.add('d-none');
    resetExitForm();
  });

  btnExit?.addEventListener('click', () => {
    currentMode = 'exit';
    btnExit.classList.add('active--exit');
    btnEntry.classList.remove('active--entry');
    exitSection.classList.remove('d-none');
    entrySection.classList.add('d-none');
  });
}

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
    await loadEntryFormData();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    setButtonLoading(btn, false);
  }
}

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

    const now      = Date.now();
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
