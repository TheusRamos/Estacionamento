import { loginUser, loginWithGoogle, onAuthChange, getCurrentUserData } from '../../services/auth.js';
import { showToast } from '../../components/toast.js';
import { setButtonLoading } from '../../components/loader.js';

function redirectUser(tipo) {
  const dest = (tipo === 'administrador' || tipo === 'operador')
    ? 'admin-home.html'
    : 'client-home.html';
  window.location.href = dest;
}

export function initLogin() {
  // Auto-redirect if already logged in
  const unsub = onAuthChange(async firebaseUser => {
    unsub();
    if (!firebaseUser) return;
    try {
      const userData = await getCurrentUserData();
      if (userData) redirectUser(userData.tipo);
    } catch (_) {}
  });

  // Toggle senha
  document.getElementById('toggle-login-password')?.addEventListener('click', function () {
    const input = document.getElementById('login-password');
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    this.textContent = show ? 'visibility_off' : 'visibility';
  });

  // Ir para cadastro
  document.getElementById('go-to-register')?.addEventListener('click', () => {
    window.location.href = 'cadastro.html';
  });

  // Limpa erro ao digitar
  document.getElementById('login-email')?.addEventListener('input', () => clearFieldError('login-email', 'login-email-error'));
  document.getElementById('login-password')?.addEventListener('input', () => clearFieldError('login-password', 'login-password-error'));

  const form     = document.getElementById('form-login');
  const btnLogin = document.getElementById('btn-login');
  const btnGoogle = document.getElementById('btn-google-login');

  // Login com e-mail
  form?.addEventListener('submit', async e => {
    e.preventDefault();
    clearErrors();

    const email = document.getElementById('login-email').value.trim();
    const senha = document.getElementById('login-password').value;

    let hasError = false;
    if (!email) { setFieldError('login-email', 'login-email-error', 'Informe seu e-mail.'); hasError = true; }
    if (!senha)  { setFieldError('login-password', 'login-password-error', 'Informe sua senha.'); hasError = true; }
    if (hasError) return;

    setButtonLoading(btnLogin, true);
    try {
      const userData = await loginUser(email, senha);
      redirectUser(userData.tipo);
    } catch (err) {
      const msg = firebaseErrorMsg(err.code) || err.message;
      showToast(msg, 'error');
      setButtonLoading(btnLogin, false);
    }
  });

  // Login com Google via InAppBrowser (Cordova detecta automaticamente)
  btnGoogle?.addEventListener('click', async () => {
    setButtonLoading(btnGoogle, true);
    try {
      const userData = await loginWithGoogle();
      redirectUser(userData.tipo);
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') {
        showToast(err.message, 'error');
      }
      setButtonLoading(btnGoogle, false);
    }
  });
}

function setFieldError(inputId, errorId, msg) {
  document.getElementById(inputId)?.classList.add('form-control--error');
  const el = document.getElementById(errorId);
  if (el) el.textContent = msg;
}

function clearFieldError(inputId, errorId) {
  document.getElementById(inputId)?.classList.remove('form-control--error');
  const el = document.getElementById(errorId);
  if (el) el.textContent = '';
}

function clearErrors() {
  clearFieldError('login-email', 'login-email-error');
  clearFieldError('login-password', 'login-password-error');
}

function firebaseErrorMsg(code) {
  const map = {
    'auth/invalid-credential':     'E-mail ou senha incorretos.',
    'auth/user-not-found':         'Usuário não encontrado.',
    'auth/wrong-password':         'Senha incorreta.',
    'auth/too-many-requests':      'Muitas tentativas. Tente mais tarde.',
    'auth/user-disabled':          'Conta desativada.',
    'auth/network-request-failed': 'Sem conexão. Verifique sua internet.'
  };
  return map[code];
}
