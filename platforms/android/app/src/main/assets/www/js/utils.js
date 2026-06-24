/** Formata valor como moeda BRL */
export function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
}

/** Formata duração em ms para HH:MM:SS */
export function formatDuration(ms) {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** Formata um Timestamp do Firestore ou Date para exibição */
export function formatDateTime(ts) {
  if (!ts) return '—';
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  }).format(date);
}

export function formatDate(ts) {
  if (!ts) return '—';
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  }).format(date);
}

/** Retorna badge HTML de status de sessão */
export function sessionStatusBadge(status) {
  const map = {
    'em andamento': 'badge--info',
    'finalizada':   'badge--warning',
    'paga':         'badge--success'
  };
  return `<span class="badge ${map[status] || 'badge--neutral'}">${status}</span>`;
}

/** Retorna badge HTML de status de reserva */
export function reservaStatusBadge(status) {
  const map = {
    'ativa':     'badge--primary',
    'expirada':  'badge--danger',
    'concluida': 'badge--success',
    'cancelada': 'badge--neutral'
  };
  return `<span class="badge ${map[status] || 'badge--neutral'}">${status}</span>`;
}

/** Retorna badge HTML de status de mensalista */
export function mensalistaStatusBadge(status) {
  const map = {
    'ativo':     'badge--success',
    'vencido':   'badge--danger',
    'cancelado': 'badge--neutral'
  };
  return `<span class="badge ${map[status] || 'badge--neutral'}">${status}</span>`;
}

/** Sanitiza string para evitar XSS ao inserir no innerHTML */
export function esc(str) {
  const d = document.createElement('div');
  d.appendChild(document.createTextNode(str ?? ''));
  return d.innerHTML;
}

/** Tipo de vaga em texto legível */
export function tipoVagaLabel(tipo) {
  const map = { comum: 'Comum', pcd: 'PCD', preferencial: 'Preferencial' };
  return map[tipo] || tipo;
}

/** Tipo de tarifa em texto legível */
export function tipoTarifaLabel(tipo) {
  const map = { hora: 'Por hora', diaria: 'Diária', mensal: 'Mensal' };
  return map[tipo] || tipo;
}
