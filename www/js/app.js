import { onAuthChange, getCurrentUserData, logoutUser } from './services/auth.js';
import { showToast } from './components/toast.js';

import { initLogin }            from './pages/auth/login.js';
import { initRegister }         from './pages/auth/register.js';
import { initClientDashboard }  from './pages/client/dashboard.js';
import { initClientSpots }      from './pages/client/spots.js';
import { initClientVehicles }   from './pages/client/vehicles.js';
import { initClientSessions }   from './pages/client/sessions.js';
import { initAdminDashboard }   from './pages/admin/dashboard.js';
import { initAdminEntry }       from './pages/admin/entry.js';
import { initAdminSectors }     from './pages/admin/sectors.js';
import { initAdminRates }       from './pages/admin/rates.js';
import { initAdminSubscribers } from './pages/admin/subscribers.js';
import { initAdminSessions }    from './pages/admin/sessions.js';

// ─── Estado global ────────────────────────────────────────────────
export let currentUser = null;

const unsubscribers = [];
export function registerUnsub(fn) { if (fn) unsubscribers.push(fn); }
function clearUnsubs() {
  unsubscribers.forEach(fn => { try { fn(); } catch (_) {} });
  unsubscribers.length = 0;
}

// ─── View manager ─────────────────────────────────────────────────

export function showPage(id) {
  document.querySelectorAll('.page-view').forEach(el => el.classList.remove('active'));
  const page = document.getElementById(id);
  if (page) page.classList.add('active');
  window.scrollTo(0, 0);
  Sidebar.close();
}

// ─── Topbar ───────────────────────────────────────────────────────

const Topbar = {
  el:       null,
  titleEl:  null,
  menuBtn:  null,
  backBtn:  null,
  actionsEl: null,
  _backCb: null,

  init() {
    this.el        = document.getElementById('app-topbar');
    this.titleEl   = document.getElementById('topbar-title');
    this.menuBtn   = document.getElementById('topbar-menu-btn');
    this.backBtn   = document.getElementById('topbar-back-btn');
    this.actionsEl = document.getElementById('topbar-actions');

    this.menuBtn?.addEventListener('click', () => Sidebar.open());
    this.backBtn?.addEventListener('click', () => { if (this._backCb) this._backCb(); });
  },

  show(opts = {}) {
    if (!this.el) return;
    this.el.style.display = '';
    this.titleEl.textContent = opts.title || 'Estacionamento';

    if (opts.back) {
      this._backCb = opts.back;
      this.backBtn.style.display = '';
      this.menuBtn.style.display = 'none';
    } else {
      this._backCb = null;
      this.backBtn.style.display = 'none';
      this.menuBtn.style.display = '';
    }

    this.actionsEl.innerHTML = '';
    if (opts.actions) {
      this.actionsEl.innerHTML = opts.actions;
    }
  },

  hide() {
    if (this.el) this.el.style.display = 'none';
  }
};

// ─── Sidebar ──────────────────────────────────────────────────────

const Sidebar = {
  el:       null,
  overlay:  null,
  navEl:    null,
  _activeItem: null,

  init() {
    this.el      = document.getElementById('app-sidebar');
    this.overlay = document.getElementById('sidebar-overlay');
    this.navEl   = document.getElementById('sidebar-nav');

    document.getElementById('sidebar-close-btn')?.addEventListener('click', () => this.close());
    this.overlay?.addEventListener('click', () => this.close());
    document.getElementById('btn-sidebar-logout')?.addEventListener('click', doLogout);
  },

  open() {
    this.el?.classList.add('open');
    this.overlay?.classList.add('active');
    document.body.style.overflow = 'hidden';
  },

  close() {
    this.el?.classList.remove('open');
    this.overlay?.classList.remove('active');
    document.body.style.overflow = '';
  },

  setUser(user) {
    const nameEl = document.getElementById('sidebar-user-name');
    const roleEl = document.getElementById('sidebar-user-role');
    const avatarEl = document.getElementById('sidebar-avatar');
    if (nameEl) nameEl.textContent = user.nome || user.email || '—';
    const roles = { cliente: 'Cliente', administrador: 'Administrador', operador: 'Operador' };
    if (roleEl) roleEl.textContent = roles[user.tipo] || user.tipo || '—';
    if (avatarEl) avatarEl.textContent = (user.nome || user.email || '?')[0].toUpperCase();
  },

  buildClientNav() {
    if (!this.navEl) return;
    this.navEl.innerHTML = `
      <p class="sidebar__nav-section">Menu</p>
      <button class="sidebar__nav-item active" data-nav="client-home">
        <span class="material-symbols-rounded sidebar__nav-icon">home</span>
        Início
      </button>
      <button class="sidebar__nav-item" data-nav="client-spots">
        <span class="material-symbols-rounded sidebar__nav-icon">local_parking</span>
        Vagas
      </button>
      <button class="sidebar__nav-item" data-nav="client-vehicles">
        <span class="material-symbols-rounded sidebar__nav-icon">directions_car</span>
        Veículos
      </button>
      <button class="sidebar__nav-item" data-nav="client-sessions">
        <span class="material-symbols-rounded sidebar__nav-icon">receipt_long</span>
        Histórico
      </button>`;
    this._bindClientNav();
  },

  buildAdminNav() {
    if (!this.navEl) return;
    this.navEl.innerHTML = `
      <p class="sidebar__nav-section">Painel</p>
      <button class="sidebar__nav-item active" data-nav="admin-home">
        <span class="material-symbols-rounded sidebar__nav-icon">dashboard</span>
        Dashboard
      </button>
      <button class="sidebar__nav-item" data-nav="admin-entry">
        <span class="material-symbols-rounded sidebar__nav-icon">swap_horiz</span>
        Entrada / Saída
      </button>
      <button class="sidebar__nav-item" data-nav="admin-subscribers">
        <span class="material-symbols-rounded sidebar__nav-icon">card_membership</span>
        Mensalistas
      </button>
      <p class="sidebar__nav-section">Gestão</p>
      <button class="sidebar__nav-item" data-nav="admin-manage">
        <span class="material-symbols-rounded sidebar__nav-icon">settings</span>
        Gerenciar
      </button>`;
    this._bindAdminNav();
  },

  setActive(navKey) {
    this.navEl?.querySelectorAll('.sidebar__nav-item').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.nav === navKey);
    });
    this._activeItem = navKey;
  },

  _bindClientNav() {
    const tabTitles = {
      'client-home':     'Início',
      'client-spots':    'Vagas disponíveis',
      'client-vehicles': 'Meus veículos',
      'client-sessions': 'Histórico',
    };
    this.navEl.addEventListener('click', e => {
      const btn = e.target.closest('[data-nav]');
      if (!btn) return;
      const key = btn.dataset.nav;
      this.setActive(key);
      showClientTab(key);
      Topbar.show({ title: tabTitles[key] || 'Estacionamento' });
      this.close();
    });
  },

  _bindAdminNav() {
    const tabTitles = {
      'admin-home':        'Dashboard',
      'admin-entry':       'Entrada / Saída',
      'admin-manage':      'Gerenciamento',
      'admin-subscribers': 'Mensalistas',
    };
    this.navEl.addEventListener('click', e => {
      const btn = e.target.closest('[data-nav]');
      if (!btn) return;
      const key = btn.dataset.nav;
      this.setActive(key);
      showAdminTab(key);
      Topbar.show({ title: tabTitles[key] || 'Estacionamento' });
      this.close();
    });
  }
};

// ─── Tab helpers ──────────────────────────────────────────────────

function showClientTab(tabId) {
  document.querySelectorAll('.client-tab').forEach(t => t.classList.remove('active'));
  document.getElementById(tabId)?.classList.add('active');
}

function showAdminTab(tabId) {
  document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
  document.getElementById(tabId)?.classList.add('active');
}

// ─── Logout ───────────────────────────────────────────────────────

async function doLogout() {
  try {
    clearUnsubs();
    await logoutUser();
    currentUser = null;
    Sidebar.close();
    Topbar.hide();
    showPage('page-login');
  } catch (err) {
    showToast('Erro ao sair: ' + err.message, 'error');
  }
}

// ─── Inicialização por tipo de usuário ────────────────────────────

async function initClientView(user) {
  currentUser = user;

  Sidebar.buildClientNav();
  Sidebar.setUser(user);
  Topbar.show({ title: 'Início' });
  
  showPage('page-client');
  showClientTab('client-home');

  // Ações rápidas da home — navegam entre tabs
  document.getElementById('quick-reserve')?.addEventListener('click', () => {
    Sidebar.setActive('client-spots');
    showClientTab('client-spots');
    Topbar.show({ title: 'Vagas disponíveis' });
  });
  document.getElementById('quick-vehicles')?.addEventListener('click', () => {
    Sidebar.setActive('client-vehicles');
    showClientTab('client-vehicles');
    Topbar.show({ title: 'Meus veículos' });
  });
  document.getElementById('quick-history')?.addEventListener('click', () => {
    Sidebar.setActive('client-sessions');
    showClientTab('client-sessions');
    Topbar.show({ title: 'Histórico' });
  });

  initClientDashboard(user);
  initClientSpots(user);
  initClientVehicles(user);
  initClientSessions(user);
}

async function initAdminView(user) {
  currentUser = user;

  Sidebar.buildAdminNav();
  Sidebar.setUser(user);
  Topbar.show({ title: 'Dashboard' });
  
  showPage('page-admin');
  showAdminTab('admin-home');

  initAdminDashboard(user);
  initAdminEntry(user);
  initAdminSubscribers(user);

  setupAdminSubPages(user);
}

function setupAdminSubPages(user) {
  // Setores e Vagas
  document.getElementById('go-sectors')?.addEventListener('click', () => {
    showPage('page-admin-sectors');
    Topbar.show({
      title: 'Setores e Vagas',
      back: () => {
        showPage('page-admin');
        Sidebar.setActive('admin-manage');
        Topbar.show({ title: 'Gerenciamento' });
      },
      actions: `<button class="icon-btn" id="btn-add-sector" title="Novo setor">
        <span class="material-symbols-rounded">add_box</span>
      </button>`
    });
    initAdminSectors(user);
  });

  // Tarifas
  document.getElementById('go-rates')?.addEventListener('click', () => {
    showPage('page-admin-rates');
    Topbar.show({
      title: 'Tarifas',
      back: () => {
        showPage('page-admin');
        Sidebar.setActive('admin-manage');
        Topbar.show({ title: 'Gerenciamento' });
      },
      actions: `<button class="icon-btn" id="btn-add-rate" title="Nova tarifa">
        <span class="material-symbols-rounded">add</span>
      </button>`
    });
    initAdminRates(user);
  });

  // Sessões admin
  document.getElementById('go-sessions-admin')?.addEventListener('click', () => {
    showPage('page-admin-sessions');
    Topbar.show({
      title: 'Sessões',
      back: () => {
        showPage('page-admin');
        Sidebar.setActive('admin-manage');
        Topbar.show({ title: 'Gerenciamento' });
      }
    });
    initAdminSessions(user);
  });
}

// ─── Bootloader ───────────────────────────────────────────────────

async function boot() {
  if (window.cordova) {
    await new Promise(res => document.addEventListener('deviceready', res, { once: true }));
  }

  Topbar.init();
  Sidebar.init();

  initLogin();
  initRegister();

  onAuthChange(async firebaseUser => {
    if (!firebaseUser) {
      clearUnsubs();
      currentUser = null;
      Topbar.hide();
      showPage('page-login');
      return;
    }

    try {
      const userData = await getCurrentUserData();
      if (!userData) {
        clearUnsubs();
        Topbar.hide();
        showPage('page-login');
        return;
      }

      clearUnsubs();

      if (userData.tipo === 'administrador' || userData.tipo === 'operador') {
        await initAdminView(userData);
      } else {
        await initClientView(userData);
      }
    } catch (err) {
      console.error('Erro ao inicializar:', err);
      showToast('Erro ao carregar dados. Tente novamente.', 'error');
      showPage('page-login');
    }
  });
}

boot();
