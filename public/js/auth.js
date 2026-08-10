// Shared auth utilities
const TOKEN_KEY = 'ob_token';
const ROLE_KEY = 'ob_role';

function getToken() { return localStorage.getItem(TOKEN_KEY); }
function getRole() { return localStorage.getItem(ROLE_KEY); }

function requireAuth() {
  const token = getToken();
  if (!token) { window.location.href = '/login'; return null; }
  return token;
}

function requireAdmin() {
  const token = requireAuth();
  if (!token) return null;
  const role = getRole();
  if (role !== 'admin') { window.location.href = '/dashboard'; return null; }
  return token;
}

async function apiFetch(url, options = {}) {
  const token = getToken();
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });
  if (res.status === 401) { localStorage.clear(); window.location.href = '/login'; }
  return res;
}

function logout() {
  apiFetch('/api/logout', { method: 'POST' }).finally(() => {
    localStorage.clear();
    window.location.href = '/login';
  });
}

// Toast notifications
function toast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `
    <span style="color:${type === 'success' ? 'var(--success)' : 'var(--danger)'}">
      ${type === 'success' ? '✓' : '✗'}
    </span>
    <span>${message}</span>
  `;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

// Apply saved theme
const savedTheme = localStorage.getItem('ob_theme');
if (savedTheme) document.documentElement.setAttribute('data-theme', savedTheme);

// Inject Admin Panel link in sidebar
document.addEventListener('DOMContentLoaded', () => {
  if (getRole() === 'admin' && !window.location.pathname.startsWith('/admin')) {
    const nav = document.querySelector('.sidebar-nav');
    if (nav) {
      const adminLink = document.createElement('a');
      adminLink.href = '/admin';
      adminLink.className = 'nav-item';
      adminLink.style.color = 'var(--violet-light)';
      adminLink.innerHTML = `
        <svg class="nav-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
        Admin Panel
      `;
      nav.appendChild(adminLink);
    }
  }

  // Setup mobile overlay if missing
  if (document.querySelector('.sidebar') && !document.querySelector('.sidebar-overlay')) {
    const overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    overlay.onclick = toggleSidebar;
    document.body.appendChild(overlay);
  }
});

function toggleSidebar() {
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.querySelector('.sidebar-overlay');
  if (sidebar && overlay) {
    sidebar.classList.toggle('open');
    overlay.classList.toggle('open');
  }
}

