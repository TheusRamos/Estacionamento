import { registerUser } from '../../services/auth.js';
import { showToast } from '../../components/toast.js';
import { setButtonLoading } from '../../components/loader.js';

const PHONE_RE  = /^\(?\d{2}\)?\s?\d{4,5}[-\s]?\d{4}$/;
const INJECT_RE = /[<>"'`\\;{}()|]/;

export function initRegister() {
  setupToggle('toggle-reg-password', 'reg-password');
  setupToggle('toggle-reg-confirm',  'reg-password-confirm');
  setupPhoneMask('reg-phone');
  setupLiveValidation();

  document.getElementById('go-to-login')?.addEventListener('click', () => {
    clearAllErrors();
    document.querySelectorAll('.page-view').forEach(el => el.classList.remove('active'));
    document.getElementById('page-login')?.classList.add('active');
  });

  const form   = document.getElementById('form-register');
  const btnReg = document.getElementById('btn-register');

  form?.addEventListener('submit', async e => {
    e.preventDefault();
    clearAllErrors();

    const nome    = document.getElementById('reg-name').value.trim();
    const email   = document.getElementById('reg-email').value.trim();
    const tel     = document.getElementById('reg-phone').value.trim();
    const senha   = document.getElementById('reg-password').value;
    const confirm = document.getElementById('reg-password-confirm').value;

    let hasError = false;

    if (!nome) {
      setError('reg-name', 'reg-name-error', 'Informe seu nome completo.');
      hasError = true;
    } else if (INJECT_RE.test(nome)) {
      setError('reg-name', 'reg-name-error', 'Nome contém caracteres inválidos.');
      hasError = true;
    }

    if (!email) {
      setError('reg-email', 'reg-email-error', 'Informe seu e-mail.');
      hasError = true;
    }

    if (!tel) {
      setError('reg-phone', 'reg-phone-error', 'Informe seu telefone.');
      hasError = true;
    } else if (!PHONE_RE.test(tel.replace(/\s/g, ''))) {
      setError('reg-phone', 'reg-phone-error', 'Formato inválido. Ex: (11) 99999-9999');
      hasError = true;
    }

    if (!senha) {
      setError('reg-password', 'reg-password-error', 'Informe uma senha.');
      hasError = true;
    } else if (senha.length < 6) {
      setError('reg-password', 'reg-password-error', 'A senha deve ter ao menos 6 caracteres.');
      hasError = true;
    }

    if (!confirm) {
      setError('reg-password-confirm', 'reg-confirm-error', 'Confirme sua senha.');
      hasError = true;
    } else if (senha && confirm && senha !== confirm) {
      setError('reg-password-confirm', 'reg-confirm-error', 'As senhas não coincidem.');
      hasError = true;
    }

    if (hasError) return;

    setButtonLoading(btnReg, true);
    try {
      await registerUser({ nome, email, telefone: tel, senha });
      showToast('Conta criada com sucesso!', 'success');
      // onAuthChange cuida do redirecionamento
    } catch (err) {
      const msg = firebaseErrorMsg(err.code) || err.message;
      showToast(msg, 'error');
      if (err.code === 'auth/email-already-in-use') {
        setError('reg-email', 'reg-email-error', 'Este e-mail já está cadastrado.');
      }
    } finally {
      setButtonLoading(btnReg, false);
    }
  });
}

function setupLiveValidation() {
  const fields = [
    ['reg-name',             'reg-name-error'],
    ['reg-email',            'reg-email-error'],
    ['reg-phone',            'reg-phone-error'],
    ['reg-password',         'reg-password-error'],
    ['reg-password-confirm', 'reg-confirm-error'],
  ];
  fields.forEach(([id, errId]) => {
    document.getElementById(id)?.addEventListener('input', () => clearError(id, errId));
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

function setError(inputId, errorId, msg) {
  document.getElementById(inputId)?.classList.add('form-control--error');
  const el = document.getElementById(errorId);
  if (el) el.textContent = msg;
}

function clearError(inputId, errorId) {
  document.getElementById(inputId)?.classList.remove('form-control--error');
  const el = document.getElementById(errorId);
  if (el) el.textContent = '';
}

function clearAllErrors() {
  [
    ['reg-name',             'reg-name-error'],
    ['reg-email',            'reg-email-error'],
    ['reg-phone',            'reg-phone-error'],
    ['reg-password',         'reg-password-error'],
    ['reg-password-confirm', 'reg-confirm-error'],
  ].forEach(([id, errId]) => clearError(id, errId));
}

function firebaseErrorMsg(code) {
  const map = {
    'auth/email-already-in-use':   'Este e-mail já está cadastrado.',
    'auth/invalid-email':          'E-mail inválido.',
    'auth/weak-password':          'Senha muito fraca. Use ao menos 6 caracteres.',
    'auth/network-request-failed': 'Sem conexão. Verifique sua internet.'
  };
  return map[code];
}
