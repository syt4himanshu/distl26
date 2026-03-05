// login.js - handles login form, token storage, and redirect

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  const loginButton = document.querySelector('.login-button');
  const successMessage = document.getElementById('successMessage');
  const rememberCheckbox = document.getElementById('remember');

  const usernameError = document.getElementById('usernameError');
  const passwordError = document.getElementById('passwordError');

  const API_BASE = window.Api ? window.Api.API_BASE : 'http://localhost:5002';

  function showFieldError(input, errorElement, message) {
    input.classList.add('error');
    errorElement.textContent = message;
    errorElement.classList.add('show');
  }

  function clearFieldError(input, errorElement) {
    input.classList.remove('error');
    errorElement.classList.remove('show');
  }

  function validateUsername(value) {
    if (!value) return 'Username is required';
    if (value.length < 3) return 'Username must be at least 3 characters';
    return '';
  }

  function validatePassword(value) {
    if (!value) return 'Password is required';
    if (value.length < 6) return 'Password must be at least 6 characters';
    return '';
  }

  function resolveRoleRedirect(role) {
    if (role === 'admin') return './Admin/a.html';
    if (role === 'faculty') return './Teacher/t.html';
    if (role === 'student') return './Student/dashboard.html';
    return './homepage.html';
  }

  async function handleLoginSubmit(event) {
    event.preventDefault();

    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    const usernameErrorMsg = validateUsername(username);
    const passwordErrorMsg = validatePassword(password);

    if (usernameErrorMsg) {
      showFieldError(usernameInput, usernameError, usernameErrorMsg);
    } else {
      clearFieldError(usernameInput, usernameError);
    }

    if (passwordErrorMsg) {
      showFieldError(passwordInput, passwordError, passwordErrorMsg);
    } else {
      clearFieldError(passwordInput, passwordError);
    }

    if (usernameErrorMsg || passwordErrorMsg) return;

    loginButton.classList.add('loading');
    loginButton.disabled = true;

    try {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uid: username,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const message = data?.error || 'Login failed';
        showFieldError(usernameInput, usernameError, message);
        loginButton.classList.remove('loading');
        loginButton.disabled = false;
        return;
      }

      const token = data.access_token || data.accessToken;
      if (!token) {
        showFieldError(usernameInput, usernameError, 'Missing token in response');
        loginButton.classList.remove('loading');
        loginButton.disabled = false;
        return;
      }

      if (window.Api) {
        window.Api.setToken(token);
        if (data.user?.role) {
          window.Api.setRole(data.user.role);
        }
      } else {
        localStorage.setItem('access_token', token);
        if (data.user?.role) {
          localStorage.setItem('user_role', data.user.role);
        }
      }

      if (rememberCheckbox.checked) {
        localStorage.setItem('remember_user', username);
      } else {
        localStorage.removeItem('remember_user');
      }

      successMessage.classList.add('show');

      setTimeout(() => {
        const role =
          data.user?.role ||
          (window.Api ? localStorage.getItem('user_role') : localStorage.getItem('user_role'));
        window.location.href = resolveRoleRedirect(role);
      }, 1000);
    } catch (err) {
      showFieldError(usernameInput, usernameError, 'Network error. Please try again.');
      loginButton.classList.remove('loading');
      loginButton.disabled = false;
    }
  }

  // Attach events
  loginForm.addEventListener('submit', handleLoginSubmit);

  usernameInput.addEventListener('input', () => clearFieldError(usernameInput, usernameError));
  passwordInput.addEventListener('input', () => clearFieldError(passwordInput, passwordError));

  // Restore remembered username
  const rememberedUser = localStorage.getItem('remember_user');
  if (rememberedUser) {
    usernameInput.value = rememberedUser;
    rememberCheckbox.checked = true;
  }

  // If already logged in, verify token and redirect
  (async () => {
    if (!window.Api) return;
    const token = window.Api.getToken();
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE}/api/auth/verify-token`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data?.valid) {
        if (data.user?.role) {
          window.Api.setRole(data.user.role);
        }
        const role = data.user?.role || localStorage.getItem('user_role');
        window.location.href = resolveRoleRedirect(role);
      }
    } catch {
      // ignore and stay on login
    }
  })();
});

