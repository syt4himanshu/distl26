const API_BASE = 'http://localhost:5002';

const TOKEN_KEY = 'access_token';
const ROLE_KEY = 'user_role';

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token) {
  if (!token) return;
  localStorage.setItem(TOKEN_KEY, token);
}

function setRole(role) {
  if (!role) return;
  localStorage.setItem(ROLE_KEY, role);
}

function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ROLE_KEY);
}

function resolveLoginPath() {
  const path = window.location.pathname;
  const inSubdir =
    path.includes('/Admin/') ||
    path.includes('/Teacher/') ||
    path.includes('/Student/');
  return inSubdir ? '../login.html' : './login.html';
}

function redirectToLogin() {
  window.location.replace(resolveLoginPath());
}

async function apiFetch(path, options = {}) {
  const token = getToken();

  if (!token) {
    redirectToLogin();
    throw new Error('Missing access token');
  }

  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;

  const headers = new Headers(options.headers || {});
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    clearAuth();
    redirectToLogin();
    throw new Error('Unauthorized');
  }

  return response;
}

async function verifyToken() {
  const token = getToken();
  if (!token) return { valid: false };

  try {
    const res = await fetch(`${API_BASE}/api/auth/verify`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      if (res.status === 401) {
        clearAuth();
        redirectToLogin();
      }
      return { valid: false };
    }

    const data = await res.json();
    if (data?.user?.role) {
      setRole(data.user.role);
    }
    return data;
  } catch (err) {
    return { valid: false };
  }
}

window.Api = {
  API_BASE,
  apiFetch,
  getToken,
  setToken,
  setRole,
  clearAuth,
  verifyToken,
  redirectToLogin,
};

