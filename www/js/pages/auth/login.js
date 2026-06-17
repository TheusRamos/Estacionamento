import { loginUser } from '../../services/auth.js';
import { showToast } from '../../components/toast.js';
import { setButtonLoading } from '../../components/loader.js';

export function initLogin() {
  const form   = document.getElementById('form-login');
  const btnLogin = document.getElementById('btn-login');

  // Toggle senha
  document.getElementById('toggle-login-password')?.addEventListener('click', function () {
    const input = document.getElementById('login-password');
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    this.textContent = show ? 'visibility_off' : 'visibility';
  });

  // Ir para cadastro
  document.getElementById('go-to-register')?.addEventListener('click', () => {
    document.querySelectorAll('.page-view').forEach(el => el.classList.remove('active'));
    document.getElementById('page-register')?.classList.add('active');
  });

  form?.addEventListener('submit', async e => {
    e.preventDefault();

    const email = document.getElementById('login-email').value.trim();
    const senha = document.getElementById('login-password').value;

    if (!email || !senha) {
      showToast('Preencha e-mail e senha.', 'warning');
      return;
    }

    setButtonLoading(btnLogin, true);
    try {
      await loginUser(email, senha);
      // onAuthChange em app.js cuida do redirecionamento
    } catch (err) {
      const msg = firebaseErrorMsg(err.code) || err.message;
      showToast(msg, 'error');
    } finally {
      setButtonLoading(btnLogin, false);
    }
  });
}

function firebaseErrorMsg(code) {
  const map = {
    'auth/invalid-credential':        'E-mail ou senha incorretos.',
    'auth/user-not-found':            'Usuário não encontrado.',
    'auth/wrong-password':            'Senha incorreta.',
    'auth/too-many-requests':         'Muitas tentativas. Tente mais tarde.',
    'auth/user-disabled':             'Conta desativada.',
    'auth/network-request-failed':    'Sem conexão. Verifique sua internet.'
  };
  return map[code];
}
