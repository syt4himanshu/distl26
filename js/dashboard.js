// dashboard.js - generic JWT protection and logout helpers

document.addEventListener('DOMContentLoaded', () => {
  if (!window.Api) {
    console.error('Api helper not found. Make sure js/api.js is loaded first.');
    return;
  }

  protectDashboard();
  setupLogout();
});

async function protectDashboard() {
  const token = Api.getToken();
  if (!token) {
    Api.redirectToLogin();
    return;
  }

  const result = await Api.verifyToken();
  if (!result.valid) {
    Api.clearAuth();
    Api.redirectToLogin();
    return;
  }

  // Token is valid; you can use result.user if needed
}

function setupLogout(buttonSelector = '#logoutBtn') {
  const btn =
    typeof buttonSelector === 'string'
      ? document.querySelector(buttonSelector)
      : buttonSelector;

  if (!btn) return;

  btn.addEventListener('click', () => {
    Api.clearAuth();
    Api.redirectToLogin();
  });
}

// Example: protected API call using the helper
async function fetchAdminStats() {
  try {
    const res = await Api.apiFetch('/api/admin/statistics', {
      method: 'GET',
    });
    if (!res.ok) {
      throw new Error('Failed to load admin statistics');
    }
    const data = await res.json();
    // Use `data` to update dashboard UI
    return data;
  } catch (err) {
    console.error(err);
    throw err;
  }
}

