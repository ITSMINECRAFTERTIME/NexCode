// ── NAVIGATION ──
function navigate(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const page = document.getElementById('page-' + pageId);
  if (page) page.classList.add('active');
  document.querySelectorAll(`[data-page="${pageId}"]`).forEach(n => n.classList.add('active'));
  document.querySelector('.topbar-title').textContent = pageTitles[pageId] || 'Dashboard';
  closeSidebar();
  window.scrollTo(0, 0);
}

const pageTitles = {
  overview: 'Overview', scripts: 'Scripts', keys: 'Key Manager',
  projects: 'Projects', webhooks: 'Webhooks', api: 'API Keys',
  discord: 'Discord Bot', settings: 'Settings'
};

// ── SIDEBAR MOBILE ──
function openSidebar() {
  document.querySelector('.sidebar').classList.add('open');
  document.querySelector('.sidebar-overlay').classList.add('open');
}
function closeSidebar() {
  document.querySelector('.sidebar').classList.remove('open');
  document.querySelector('.sidebar-overlay').classList.remove('open');
}

// ── TOAST ──
function toast(msg, type = 'info') {
  const icons = {
    success: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`,
    error: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    info: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`
  };
  const colors = { success: '#10b981', error: '#ef4444', info: '#2f6bff' };
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.style.color = colors[type];
  t.innerHTML = `${icons[type]}<span style="color:#f0f4ff">${msg}</span>`;
  document.querySelector('.toast-container').appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

// ── MODAL ──
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

// ── TOGGLES ──
document.addEventListener('click', e => {
  const toggle = e.target.closest('.toggle');
  if (toggle) {
    toggle.classList.toggle('on');
    const label = toggle.closest('.toggle-wrap')?.querySelector('.toggle-label');
    if (label) {
      const isOn = toggle.classList.contains('on');
    }
  }

  // copy button
  if (e.target.closest('.copy-btn')) {
    const btn = e.target.closest('.copy-btn');
    const target = btn.dataset.copy;
    const text = target ? document.getElementById(target)?.textContent : btn.previousElementSibling?.textContent;
    if (text) {
      navigator.clipboard.writeText(text.trim()).then(() => toast('Copied to clipboard', 'success'));
    }
  }

  // opt level
  if (e.target.closest('.opt-level')) {
    const el = e.target.closest('.opt-level');
    el.closest('.opt-levels').querySelectorAll('.opt-level').forEach(o => o.classList.remove('selected'));
    el.classList.add('selected');
  }
});

// ── KEY GENERATION ──
function genKey(prefix = 'NEXC') {
  const seg = () => Math.random().toString(36).substr(2, 4).toUpperCase();
  return `${prefix}-${seg()}-${seg()}-${seg()}-${seg()}`;
}

// ── SEARCH / FILTER ──
function filterTable(inputId, tableId) {
  const q = document.getElementById(inputId).value.toLowerCase();
  document.querySelectorAll(`#${tableId} tbody tr`).forEach(row => {
    row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
  });
}

// ── COUNTER ANIMATION ──
function animateCounter(el) {
  const target = parseInt(el.dataset.target || el.textContent.replace(/,/g,''));
  const duration = 1000;
  const start = performance.now();
  const update = now => {
    const progress = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.floor(ease * target).toLocaleString();
    if (progress < 1) requestAnimationFrame(update);
  };
  requestAnimationFrame(update);
}

// ── INIT ──
document.addEventListener('DOMContentLoaded', () => {
  navigate('overview');
  document.querySelectorAll('[data-target]').forEach(el => {
    if (el.dataset.target) animateCounter(el);
  });
});
