const msg = document.getElementById('msg');
let isRegister = false;
const nameField = document.getElementById('nameField');
const registerLink = document.getElementById('registerLink');
const loginBtn = document.querySelector('.login-btn');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');

registerLink.addEventListener('click', (e) => {
  e.preventDefault();
  isRegister = !isRegister;
  nameField.style.display = isRegister ? 'block' : 'none';
  document.getElementById('name').required = isRegister;
  loginBtn.textContent = isRegister ? 'Create Account' : 'Sign In';
  document.querySelector('.sub').textContent = isRegister ? 'Create your account' : 'Sign in to your account';
  msg.textContent = '';
});

async function auth(endpoint) {
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  const name = document.getElementById('name').value.trim();
  msg.style.color = 'var(--muted)';
  msg.textContent = 'Please wait...';
  loginBtn.disabled = true;
  loginBtn.style.opacity = '0.6';
  try {
    const body = isRegister ? { name, email, password } : { email, password };
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok) {
      msg.style.color = '#ff3b30';
      if (res.status === 429) {
        const retry = data.retryAfter || 900;
        msg.textContent = 'Too many attempts. Try again in ' + Math.ceil(retry / 60) + ' minutes.';
      } else {
        msg.textContent = data.error || 'Failed';
      }
      passwordInput.value = '';
      return;
    }
    if (endpoint === '/api/register') {
      msg.style.color = '#4cd964';
      msg.textContent = 'Account created. Redirecting...';
      emailInput.value = '';
      passwordInput.value = '';
      setTimeout(() => { window.location.href = '/'; }, 800);
    } else {
      localStorage.setItem('gymUser', data.user.email);
      emailInput.value = '';
      passwordInput.value = '';
      window.location.href = '/';
    }
  } catch (e) {
    msg.style.color = '#ff3b30';
    msg.textContent = 'Cannot reach server. Is it running?';
  } finally {
    loginBtn.disabled = false;
    loginBtn.style.opacity = '1';
  }
}
document.getElementById('loginForm').addEventListener('submit', (e) => {
  e.preventDefault();
  e.stopPropagation();
  auth(isRegister ? '/api/register' : '/api/login');
  return false;
});

// --- Google OAuth ---
const googleBtn = document.getElementById('googleBtn');
if (googleBtn) {
  googleBtn.addEventListener('click', () => {
    window.location.href = '/api/auth/google';
  });
}
