/**
 * Ponto de entrada principal da SPA.
 * Orquestra autenticação, roteamento e inicialização das páginas.
 */

import { onAuthChange, getCurrentUserData, logoutUser } from './services/auth.js';
import { showToast } from './components/toast.js';

// Pages
import { initLogin }    from './pages/auth/login.js';
import { initRegister } from './pages/auth/register.js';
import { initClientDashboard } from './pages/client/dashboard.js';
import { initClientSpots }     from './pages/client/spots.js';
import { initClientVehicles }  from './pages/client/vehicles.js';
import { initClientSessions }  from './pages/client/sessions.js';
import { initAdminDashboard }  from './pages/admin/dashboard.js';
import { initAdminEntry }      from './pages/admin/entry.js';
import { initAdminSectors }    from './pages/admin/sectors.js';
import { initAdminRates }      from './pages/admin/rates.js';
import { initAdminSubscribers } from './pages/admin/subscribers.js';
import { initAdminSessions }   from './pages/admin/sessions.js';

// ─── Estado global ────────────────────────────────────────────────
export let currentUser = null;

/** Guarda listeners do Firestore para unsubscribe ao trocar de usuário */
const unsubscribers = [];
export function registerUnsub(fn) { if (fn) unsubscribers.push(fn); }
function clearUnsubs() {
  unsubscribers.forEach(fn => { try { fn(); } catch (_) {} });
  unsubscribers.length = 0;
}

// ─── View manager ─────────────────────────────────────────────────

function showPage(id) {
  document.querySelectorAll('.page-view').forEach(el => el.classList.remove('active'));
  const page = document.getElementById(id);
  if (page) page.classList.add('active');
  window.scrollTo(0, 0);
}

// ─── Tab manager ──────────────────────────────────────────────────

function setupTabNav(navId, tabClass) {
  const nav = document.getElementById(navId);
  if (!nav) return;

  nav.addEventListener('click', e => {
    const btn = e.target.closest('[data-tab]');
    if (!btn) return;

    const tabId = btn.dataset.tab;

    nav.querySelectorAll('.bottom-nav__item').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    document.querySelectorAll(`.${tabClass}`).forEach(t => t.classList.remove('active'));
    const target = document.getElementById(tabId);
    if (target) target.classList.add('active');
  });
}

// ─── Logout ───────────────────────────────────────────────────────

function setupLogout() {
  document.getElementById('btn-client-logout')?.addEventListener('click', doLogout);
  document.getElementById('btn-admin-logout')?.addEventListener('click', doLogout);
}

async function doLogout() {
  try {
    clearUnsubs();
    await logoutUser();
    currentUser = null;
    showPage('page-login');
  } catch (err) {
    showToast('Erro ao sair: ' + err.message, 'error');
  }
}

// ─── Inicialização por tipo de usuário ────────────────────────────

async function initClientView(user) {
  currentUser = user;
  showPage('page-client');
  setupTabNav('client-bottom-nav', 'client-tab');

  // Inicializa todas as abas do cliente
  initClientDashboard(user);
  initClientSpots(user);
  initClientVehicles(user);
  initClientSessions(user);
}

async function initAdminView(user) {
  currentUser = user;
  showPage('page-admin');
  setupTabNav('admin-bottom-nav', 'admin-tab');

  // Inicializa abas do admin
  initAdminDashboard(user);
  initAdminEntry(user);
  initAdminSubscribers(user);

  // Subpáginas de gestão
  setupAdminSubPages(user);
}

function setupAdminSubPages(user) {
  // Setores e Vagas
  document.getElementById('go-sectors')?.addEventListener('click', () => {
    initAdminSectors(user);
    showPage('page-admin-sectors');
  });
  document.getElementById('back-from-sectors')?.addEventListener('click', () => showPage('page-admin'));

  // Tarifas
  document.getElementById('go-rates')?.addEventListener('click', () => {
    initAdminRates(user);
    showPage('page-admin-rates');
  });
  document.getElementById('back-from-rates')?.addEventListener('click', () => showPage('page-admin'));

  // Sessões admin
  document.getElementById('go-sessions-admin')?.addEventListener('click', () => {
    initAdminSessions(user);
    showPage('page-admin-sessions');
  });
  document.getElementById('back-from-sessions')?.addEventListener('click', () => showPage('page-admin'));
}

// ─── Bootloader ───────────────────────────────────────────────────

async function boot() {
  // Aguarda Cordova se estiver em app nativa
  if (window.cordova) {
    await new Promise(res => document.addEventListener('deviceready', res, { once: true }));
  }

  initLogin();
  initRegister();
  setupLogout();

  onAuthChange(async firebaseUser => {
    if (!firebaseUser) {
      clearUnsubs();
      currentUser = null;
      showPage('page-login');
      return;
    }

    try {
      const userData = await getCurrentUserData();
      if (!userData) {
        clearUnsubs();
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

// Inicia o app
boot();
