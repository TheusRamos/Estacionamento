import { onAuthChange, getCurrentUserData, logoutUser } from './services/auth.js';
import { showToast } from './components/toast.js';

const CLIENT_NAV = [
  { href: 'client-home.html',     icon: 'home',           label: 'Início',         section: 'Menu' },
  { href: 'client-vagas.html',    icon: 'local_parking',  label: 'Vagas' },
  { href: 'client-veiculos.html', icon: 'directions_car', label: 'Veículos' },
  { href: 'client-historico.html',icon: 'receipt_long',   label: 'Histórico' },
];

const ADMIN_NAV = [
  { href: 'admin-home.html',        icon: 'dashboard',       label: 'Dashboard',       section: 'Painel' },
  { href: 'admin-entrada.html',     icon: 'swap_horiz',      label: 'Entrada / Saída', section: 'Operação' },
  { href: 'admin-mensalistas.html', icon: 'card_membership', label: 'Mensalistas' },
  { href: 'admin-clientes.html',    icon: 'people',          label: 'Clientes',        section: 'Gestão' },
  { href: 'admin-setores.html',     icon: 'grid_view',       label: 'Setores e Vagas' },
  { href: 'admin-tarifas.html',     icon: 'payments',        label: 'Tarifas' },
  { href: 'admin-sessoes.html',     icon: 'receipt_long',    label: 'Sessões' },
];

function currentFilename() {
  return window.location.pathname.split('/').pop() || 'index.html';
}

function buildNav(items) {
  const navEl = document.getElementById('sidebar-nav');
  if (!navEl) return;
  const file = currentFilename();
  let html = '';
  let section = '';
  for (const item of items) {
    if (item.section && item.section !== section) {
      section = item.section;
      html += `<p class="sidebar__nav-section">${section}</p>`;
    }
    const active = file === item.href ? ' active' : '';
    html += `
      <a href="${item.href}" class="sidebar__nav-item${active}">
        <span class="material-symbols-rounded sidebar__nav-icon">${item.icon}</span>
        ${item.label}
      </a>`;
  }
  navEl.innerHTML = html;
}

function setUserInfo(user) {
  const roles = { cliente: 'Cliente', admin: 'Administrador', administrador: 'Administrador', operador: 'Operador' };
  const name  = document.getElementById('sidebar-user-name');
  const role  = document.getElementById('sidebar-user-role');
  const av    = document.getElementById('sidebar-avatar');
  if (name) name.textContent = user.nome || user.email || '—';
  if (role) role.textContent = roles[user.tipo] || user.tipo || '—';
  if (av)   av.textContent   = (user.nome || user.email || '?')[0].toUpperCase();
}

function closeSidebar() {
  document.getElementById('app-sidebar')?.classList.remove('open');
  document.getElementById('sidebar-overlay')?.classList.remove('active');
  document.body.style.overflow = '';
}

function initTopbar(title) {
  const titleEl = document.getElementById('topbar-title');
  if (titleEl) titleEl.textContent = title;

  document.getElementById('topbar-menu-btn')?.addEventListener('click', () => {
    document.getElementById('app-sidebar')?.classList.add('open');
    document.getElementById('sidebar-overlay')?.classList.add('active');
    document.body.style.overflow = 'hidden';
  });
}

function initSidebarControls() {
  document.getElementById('sidebar-close-btn')?.addEventListener('click', closeSidebar);
  document.getElementById('sidebar-overlay')?.addEventListener('click', closeSidebar);

  document.getElementById('btn-sidebar-logout')?.addEventListener('click', async () => {
    try {
      await logoutUser();
      window.location.href = 'index.html';
    } catch (err) {
      showToast('Erro ao sair: ' + err.message, 'error');
    }
  });

  // Close sidebar when a nav link is clicked (on mobile)
  document.getElementById('sidebar-nav')?.addEventListener('click', e => {
    if (e.target.closest('a')) closeSidebar();
  });
}

/**
 * Initializes layout for authenticated pages.
 * Checks auth state, builds sidebar nav, sets topbar title.
 * Returns a Promise that resolves with the user data.
 */
export function initLayout({ title = 'Estacionamento' } = {}) {
  initTopbar(title);
  initSidebarControls();

  return new Promise((resolve, reject) => {
    let ready = false;

    onAuthChange(async firebaseUser => {
      if (!firebaseUser) {
        window.location.href = 'index.html';
        if (!ready) reject(new Error('unauthenticated'));
        return;
      }

      if (ready) return;

      try {
        const userData = await getCurrentUserData();
        if (!userData) {
          window.location.href = 'index.html';
          reject(new Error('no user data'));
          return;
        }

        ready = true;
        const isAdmin = userData.tipo === 'admin' || userData.tipo === 'administrador' || userData.tipo === 'operador';
        buildNav(isAdmin ? ADMIN_NAV : CLIENT_NAV);
        setUserInfo(userData);
        resolve(userData);
      } catch (err) {
        window.location.href = 'index.html';
        reject(err);
      }
    });
  });
}
