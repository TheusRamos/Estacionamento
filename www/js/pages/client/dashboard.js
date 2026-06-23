import { registerUnsub } from '../../unsubs.js';
import { showToast } from '../../components/toast.js';
import { onVagasChange } from '../../services/vagas.js';
import { getSessaoAtivaDoUsuario, getSessoesDoUsuario } from '../../services/sessoes.js';
import { getReservaAtivaDoUsuario, cancelarReserva } from '../../services/reservas.js';
import { calcularValorSessao, getTarifas } from '../../services/tarifas.js';
import { db } from '../../config/firebase.js';
import { getDoc, doc } from 'firebase/firestore';
import { formatCurrency, formatDuration } from '../../utils.js';

let timerInterval = null;
let activeSessao  = null;
let activeTarifa  = null;

export async function initClientDashboard(user) {
  document.getElementById('client-name').textContent = user.nome.split(' ')[0];
  // Navegação rápida
  document.getElementById('quick-reserve')?.addEventListener('click', () => {
    window.location.href = 'client-vagas.html';
  });
  document.getElementById('quick-vehicles')?.addEventListener('click', () => {
    window.location.href = 'client-veiculos.html';
  });
  document.getElementById('quick-history')?.addEventListener('click', () => {
    window.location.href = 'client-historico.html';
  });

  // Botão cancelar reserva
  document.getElementById('btn-cancel-reservation')?.addEventListener('click', handleCancelReservation);

  await loadDashboardData(user);

  // Realtime: vagas disponíveis
  const unsub = onVagasChange(vagas => {
    const livres = vagas.filter(v => v.status === 'livre').length;
    document.getElementById('stat-available-spots').textContent = livres;
  });
  registerUnsub(unsub);

  // Polling leve para sessão ativa (a cada 30s)
  const pollInterval = setInterval(() => loadActiveSession(user), 30000);
  registerUnsub(() => clearInterval(pollInterval));
}

async function loadDashboardData(user) {
  await Promise.all([
    loadActiveSession(user),
    loadActiveReservation(user),
    loadSessionCount(user)
  ]);
}

async function loadActiveSession(user) {
  try {
    const sessao = await getSessaoAtivaDoUsuario(user.uid);
    activeSessao = sessao;

    if (sessao) {
      // Busca vaga e tarifa para exibir
      const [vagaSnap, tarifas] = await Promise.all([
        getFirestoreDoc('vagas', sessao.vagaId),
        getTarifas()
      ]);
      activeTarifa = tarifas.find(t => t.id === sessao.tarifaId) || null;
      const codigoVaga = vagaSnap?.codigo || '—';

      document.getElementById('active-spot-code').textContent = codigoVaga;
      document.getElementById('active-session-banner').classList.remove('d-none');
      startTimer(sessao, activeTarifa);
    } else {
      document.getElementById('active-session-banner').classList.add('d-none');
      stopTimer();
    }
  } catch (_) {}
}

async function loadActiveReservation(user) {
  try {
    const reserva = await getReservaAtivaDoUsuario(user.uid);
    const banner = document.getElementById('active-reservation-banner');

    if (!reserva) { banner.classList.add('d-none'); return; }

    // Verifica expiração
    const now = Date.now();
    const expira = reserva.expiraEm?.toMillis?.() || 0;
    if (now > expira) {
      banner.classList.add('d-none');
      return;
    }

    const vagaSnap = await getFirestoreDoc('vagas', reserva.vagaId);
    document.getElementById('res-spot-code').textContent = vagaSnap?.codigo || '—';

    const diffMin = Math.max(0, Math.round((expira - now) / 60000));
    document.getElementById('res-expires').textContent = diffMin > 0
      ? `${diffMin} min`
      : 'Expirada';

    banner.classList.remove('d-none');
    banner.dataset.reservaId = reserva.id;
    banner.dataset.vagaId    = reserva.vagaId;
  } catch (_) {}
}

async function loadSessionCount(user) {
  try {
    const sessoes = await getSessoesDoUsuario(user.uid);
    document.getElementById('stat-total-sessions').textContent = sessoes.length;
  } catch (_) {}
}

function startTimer(sessao, tarifa) {
  stopTimer();
  const entradaMs = sessao.entrada?.toMillis?.() || Date.now();

  timerInterval = setInterval(() => {
    const elapsed = Date.now() - entradaMs;
    document.getElementById('active-session-timer').textContent = formatDuration(elapsed);

    if (tarifa) {
      const minutos = Math.round(elapsed / 60000);
      const custo = calcularValorSessao(tarifa, minutos);
      document.getElementById('active-session-cost').textContent = formatCurrency(custo);
    }
  }, 1000);
}

function stopTimer() {
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
}

async function handleCancelReservation() {
  const banner = document.getElementById('active-reservation-banner');
  const reservaId = banner?.dataset.reservaId;
  const vagaId    = banner?.dataset.vagaId;
  if (!reservaId || !vagaId) return;

  try {
    await cancelarReserva(reservaId, vagaId);
    banner.classList.add('d-none');
    showToast('Reserva cancelada.', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function getFirestoreDoc(colecao, id) {
  if (!id) return null;
  const snap = await getDoc(doc(db, colecao, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}
