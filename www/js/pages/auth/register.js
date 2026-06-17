import { registerUser } from '../../services/auth.js';
import { showToast } from '../../components/toast.js';
import { setButtonLoading } from '../../components/loader.js';

const PHONE_RE   = /^\(?\d{2}\)?\s?\d{4,5}[-\s]?\d{4}$/;
const INJECT_RE  = /[<>"'`\\;{}()|]/;

export function initRegister() {
  setupToggle('toggle-reg-password',  'reg-password');
  setupToggle('toggle-reg-confirm',   'reg-password-confirm');
  setupPhoneMask('reg-phone');

  document.getElementById('go-to-login')?.addEventListener('click', () => {
    document.querySelectorAll('.page-view').forEach(el => el.classList.remove('active'));
    document.getElementById('page-login')?.classList.add('active');
  });

  const form    = document.getElementById('form-register');
  const btnReg  = document.getElementById('btn-register');

  form?.addEventListener('submit', async e => {
    e.preventDefault();

    const nome     = document.getElementById('reg-name').value.trim();
    const email    = document.getElementById('reg-email').value.trim();
    const telefone = document.getElementById('reg-phone').value.trim();
    const senha    = document.getElementById('reg-password').value;
    const confirm  = document.getElementById('reg-password-confirm').value;

    // Validações
    if (!nome || !email || !telefone || !senha || !confirm) {
      showToast('Preencha todos os campos obrigatórios.', 'warning');
      return;
    }

    if (INJECT_RE.test(nome) || INJECT_RE.test(telefone)) {
      showToast('Caracteres inválidos detectados.', 'error');
      return;
    }

    if (!PHONE_RE.test(telefone.replace(/\s/g, ''))) {
      showToast('Telefone inválido. Ex: (11) 99999-9999', 'warning');
      return;
    }

    if (senha.length < 6) {
      showToast('A senha deve ter ao menos 6 caracteres.', 'warning');
      return;
    }

    if (senha !== confirm) {
      showToast('As senhas não coincidem.', 'warning');
      return;
    }

    setButtonLoading(btnReg, true);
    try {
      await registerUser({ nome, email, telefone, senha });
      showToast('Conta criada com sucesso!', 'success');
      // onAuthChange cuida do redirecionamento
    } catch (err) {
      const msg = firebaseErrorMsg(err.code) || err.message;
      showToast(msg, 'error');
    } finally {
      setButtonLoading(btnReg, false);
    }
  });
}

function setupToggle(toggleId, inputId) {
  document.getElementById(toggleId)?.addEventListener('click', function () {
    const input = document.getElementById(inputId);
    if (!input) return;
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    this.textContent = show ? 'visibility_off' : 'visibility';
  });
}

function setupPhoneMask(inputId) {
  const input = document.getElementById(inputId);
  if (!input) return;
  input.addEventListener('input', () => {
    let v = input.value.replace(/\D/g, '').slice(0, 11);
    if (v.length > 10) {
      v = v.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
    } else if (v.length > 6) {
      v = v.replace(/^(\d{2})(\d{4})(\d+)$/, '($1) $2-$3');
    } else if (v.length > 2) {
      v = v.replace(/^(\d{2})(\d+)$/, '($1) $2');
    }
    input.value = v;
  });
}

function firebaseErrorMsg(code) {
  const map = {
    'auth/email-already-in-use':    'Este e-mail já está cadastrado.',
    'auth/invalid-email':           'E-mail inválido.',
    'auth/weak-password':           'Senha muito fraca.',
    'auth/network-request-failed':  'Sem conexão. Verifique sua internet.'
  };
  return map[code];
}
