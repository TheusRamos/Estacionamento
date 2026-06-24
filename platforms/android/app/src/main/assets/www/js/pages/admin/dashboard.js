import { registerUnsub } from '../../unsubs.js';
import { onVagasChange } from '../../services/vagas.js';
import { onSessoesAtivasChange } from '../../services/sessoes.js';
import { countReservasAtivas } from '../../services/reservas.js';
import { countMensalistasAtivos, verificarVencimentos } from '../../services/mensalistas.js';
import { getSessoesHoje } from '../../services/sessoes.js';
import { getFaturamentoHoje } from '../../services/pagamentos.js';
import { esc, formatDateTime, formatCurrency } from '../../utils.js';

export async function initAdminDashboard(user) {
  // Data atual
  const dateEl = document.getElementById('admin-date');
  if (dateEl) {
    dateEl.textContent = new Intl.DateTimeFormat('pt-BR', {
      weekday: 'long', day: 'numeric', month: 'long'
    }).format(new Date());
  }

  // Verifica vencimentos de mensalistas ao carregar
  verificarVencimentos().catch(() => {});

  // Dados assíncronos
  loadDashboardAsync();

  // Realtime vagas → atualiza círculo de ocupação e contadores
  const unsubVagas = onVagasChange(vagas => {
    const total     = vagas.length;
    const ocupadas  = vagas.filter(v => v.status === 'ocupada').length;
    const livres    = vagas.filter(v => v.status === 'livre').length;
    const reservadas = vagas.filter(v => v.status === 'reservada').length;

    document.getElementById('dash-occupied').textContent = ocupadas;
    document.getElementById('dash-free').textContent     = livres;
    document.getElementById('dash-reserved').textContent = reservadas;
    document.getElementById('dash-total').textContent    = total;

    const pct = total > 0 ? Math.round((ocupadas / total) * 100) : 0;
    document.getElementById('occupancy-pct').textContent = `${pct}%`;

    // Arco SVG: circunferência = 2π×50 ≈ 314
    const arc = document.getElementById('occupancy-arc');
    if (arc) arc.style.strokeDashoffset = 314 - (314 * pct / 100);
  });
  registerUnsub(unsubVagas);

  // Realtime sessões ativas
  const unsubSessoes = onSessoesAtivasChange(sessoes => {
    renderActiveSessions(sessoes);
  });
  registerUnsub(unsubSessoes);
}

async function loadDashboardAsync() {
  try {
    const [faturamento, sessoesHoje, reservasAtivas, mensalistasAtivos] = await Promise.all([
      getFaturamentoHoje(),
      getSessoesHoje(),
      countReservasAtivas(),
      countMensalistasAtivos()
    ]);

    document.getElementById('dash-revenue').textContent          = formatCurrency(faturamento);
    document.getElementById('dash-sessions-today').textContent    = sessoesHoje.length;
    document.getElementById('dash-active-reservations').textContent = reservasAtivas;
    document.getElementById('dash-subscribers').textContent       = mensalistasAtivos;
  } catch (_) {}
}

function renderActiveSessions(sessoes) {
  const container = document.getElementById('active-sessions-list');
  if (!container) return;

  if (!sessoes.length) {
    container.innerHTML = `
      <div class="empty-state" style="padding:var(--space-8)">
        <span class="material-symbols-rounded empty-state__icon" style="font-size:40px">directions_car</span>
        <p class="empty-state__title">Nenhuma sessão ativa</p>
      </div>`;
    return;
  }

  const now = Date.now();
  container.innerHTML = sessoes.map(s => {
    const entradaMs = s.entrada?.toMillis?.() || now;
    const elapsed   = now - entradaMs;
    const min       = Math.round(elapsed / 60000);
    const hrs       = Math.floor(min / 60);
    const rem       = min % 60;
    const tempo     = hrs > 0 ? `${hrs}h ${rem}min` : `${min}min`;

    return `
      <div class="list-item">
        <div class="list-item__icon" style="background:var(--color-info-surface);color:var(--color-info)">
          <span class="material-symbols-rounded">directions_car</span>
        </div>
        <div class="list-item__content">
          <p class="list-item__title">Sessão ${esc(s.id?.slice(-6) || '—')}</p>
          <p class="list-item__subtitle">Entrada: ${formatDateTime(s.entrada)} &middot; ${tempo}</p>
        </div>
        <span class="badge badge--info">Em andamento</span>
      </div>`;
  }).join('');
}
