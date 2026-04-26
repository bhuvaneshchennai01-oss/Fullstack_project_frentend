/* ============================================
   FinSmart – Core Application Logic
   Theme toggle, toasts, localStorage, utilities
   ============================================ */

'use strict';

/* ── Theme Management ── */
const Theme = {
  init() {
    const saved = localStorage.getItem('finsmart-theme');
    if (saved) {
      document.documentElement.setAttribute('data-theme', saved);
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
    this.updateToggleIcons();
    // Listen for system changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!localStorage.getItem('finsmart-theme')) {
        document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
        this.updateToggleIcons();
      }
    });
  },
  toggle() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('finsmart-theme', next);
    this.updateToggleIcons();
    return next;
  },
  updateToggleIcons() {
    const theme = this.get();
    const iconKey = theme === 'dark' ? 'sun' : 'moon';
    const iconContent = Icons[iconKey] || '';

    document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
      // Find the span with data-icon or the button itself if it contains the icon
      const iconSpan = btn.querySelector('[data-icon]');
      if (iconSpan) {
        iconSpan.innerHTML = iconContent;
        iconSpan.setAttribute('data-icon', iconKey);
      } else {
        btn.innerHTML = iconContent;
      }

      // Update tooltip if present
      if (btn.hasAttribute('data-tooltip')) {
        btn.setAttribute('data-tooltip', theme === 'dark' ? 'Light Mode' : 'Dark Mode');
      }
    });

    // Update settings radio buttons if they exist
    const lightRadio = document.querySelector('input[name="ui_theme"][value="light"]');
    const darkRadio = document.querySelector('input[name="ui_theme"][value="dark"]');
    if (lightRadio && darkRadio) {
      if (theme === 'dark') {
        darkRadio.checked = true;
        darkRadio.closest('.theme-option')?.classList.add('active');
        lightRadio.closest('.theme-option')?.classList.remove('active');
      } else {
        lightRadio.checked = true;
        lightRadio.closest('.theme-option')?.classList.add('active');
        darkRadio.closest('.theme-option')?.classList.remove('active');
      }
    }
  },
  get() {
    return document.documentElement.getAttribute('data-theme') || 'light';
  }
};

/* ── Toast Notifications ── */
const Toast = {
  container: null,
  init() {
    if (document.querySelector('.toast-container')) return;
    this.container = document.createElement('div');
    this.container.className = 'toast-container';
    this.container.setAttribute('role', 'alert');
    this.container.setAttribute('aria-live', 'polite');
    document.body.appendChild(this.container);
  },
  show(message, type = 'info', duration = 4000) {
    this.init();

    // Ensure message is a string
    let displayMsg = message;
    if (typeof message === 'object' && message !== null) {
      displayMsg = message.message || JSON.stringify(message);
    }

    const typeIcons = {
      success: Icons.check,
      error: Icons.alert,
      warning: Icons.alert,
      info: Icons.info
    };
    const toast = document.createElement('div');
    toast.className = `toast ${type} toast-enter`;
    toast.innerHTML = `
      <span class="toast-icon">${typeIcons[type]}</span>
      <span class="toast-message">${displayMsg}</span>
      <button class="toast-close" aria-label="Close notification">✕</button>
    `;
    toast.querySelector('.toast-close').addEventListener('click', () => this.dismiss(toast));
    this.container.appendChild(toast);
    if (duration > 0) {
      setTimeout(() => this.dismiss(toast), duration);
    }
    return toast;
  },
  dismiss(toast) {
    toast.classList.remove('toast-enter');
    toast.classList.add('toast-exit');
    setTimeout(() => toast.remove(), 300);
  },
  success(msg, dur) { return this.show(msg, 'success', dur); },
  error(msg, dur) { return this.show(msg, 'error', dur); },
  warning(msg, dur) { return this.show(msg, 'warning', dur); },
  info(msg, dur) { return this.show(msg, 'info', dur); }
};

/* ── Storage Wrapper ── */
const DB = {
  get(key) {
    try {
      // Check both local and session storage
      const local = localStorage.getItem(`finsmart-${key}`);
      if (local) return JSON.parse(local);

      const session = sessionStorage.getItem(`finsmart-${key}`);
      if (session) return JSON.parse(session);

      return null;
    } catch { return null; }
  },
  set(key, value, persistent = true) {
    const storage = persistent ? localStorage : sessionStorage;
    storage.setItem(`finsmart-${key}`, JSON.stringify(value));
  },
  remove(key) {
    localStorage.removeItem(`finsmart-${key}`);
    sessionStorage.removeItem(`finsmart-${key}`);
  }
};

/* ── Utility Helpers ── */
const Utils = {
  formatCurrency(amount) {
    if (amount === undefined || amount === null || isNaN(amount)) return '₹ 0';
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;

    // Large number formatting (Indian System - Lakhs/Crores)
    if (num >= 10000000) { // 1 Crore
      return '₹ ' + (num / 10000000).toFixed(2).replace(/\.00$/, '') + ' Cr';
    } else if (num >= 100000) { // 1 Lakh
      return '₹ ' + (num / 100000).toFixed(2).replace(/\.00$/, '') + ' L';
    }

    const formatted = new Intl.NumberFormat('en-IN', {
      style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0
    }).format(num);
    return formatted.replace('₹', '₹ ');
  },

  animateValue(id, start, end, duration, isCurrency = true) {
    const obj = document.getElementById(id);
    if (!obj) return;
    let startTimestamp = null;
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const value = Math.floor(progress * (end - start) + start);
      obj.innerHTML = isCurrency ? Utils.formatCurrency(value) : value;
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    window.requestAnimationFrame(step);
  },

  formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  },
  formatMonthName(monthStr) {
    // Input format: "2026-01" or similar
    const [year, month] = monthStr.split('-').map(Number);
    const date = new Date(year, month - 1);
    return date.toLocaleString('en-IN', { month: 'short' });
  },
  formatDateRelative(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / 86400000);
    const absDays = Math.abs(days);

    if (days === 0) return 'Today';

    if (days > 0) {
      if (days === 1) return 'Yesterday';
      return `${days} days ago`;
    } else {
      if (absDays === 1) return 'Tomorrow';
      return `In ${absDays} ${absDays === 1 ? 'day' : 'days'}`;
    }
  },
  getInitials(name) {
    if (!name) return '??';
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  },
  getAvatarColor(name) {
    const colors = [
      'hsl(224, 76%, 48%)', // blue
      'hsl(255, 70%, 48%)', // purple
      'hsl(152, 68%, 40%)', // green
      'hsl(38, 92%, 50%)',  // orange
      'hsl(0, 72%, 50%)',   // red
      'hsl(190, 70%, 42%)', // cyan
      'hsl(320, 60%, 48%)', // pink
      'hsl(280, 60%, 48%)'  // violet
    ];

    if (!name) return colors[0];

    let hash = 0;

    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + (hash * 31);
    }

    const index = Math.abs(hash) % colors.length;

    return colors[index];
  },
  debounce(fn, delay = 300) {
    let timer;
    return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay); };
  },
  isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
};

/* ── Premium SVG Icons Registry ── */
const Icons = {
  email: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>`,
  lock: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
  user: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  eye: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0z"/><circle cx="12" cy="12" r="3"/></svg>`,
  search: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>`,
  briefcase: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>`,
  check: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`,
  alert: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>`,
  arrowRight: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>`,
  arrowLeft: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>`,
  moon: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>`,
  sun: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>`,
  trending: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>`,
  pie: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>`,
  calendar: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>`,
  menu: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>`,
  star: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
  heart: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>`,
  settings: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>`,
  chart: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" x2="12" y1="20" y2="10"/><line x1="18" x2="18" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="16"/></svg>`,
  home: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
  bell: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>`,
  download: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>`,
  info: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>`,
  trash: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>`,
  eyeOff: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>`,
  plus: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>`,
};

const getIcon = (key) => Icons[key] || '';

// Auto-inject icons on load
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-icon]').forEach(el => {
    const key = el.getAttribute('data-icon');
    if (Icons[key]) el.innerHTML = Icons[key];
  });
});

/* ── Form Helpers ── */
function showFieldError(fieldId, message) {
  const field = document.getElementById(fieldId);
  if (!field) return;
  field.classList.add('error');

  // Shake the element and parent
  const target = field.closest('.form-group') || field.parentElement;

  // Apply shake to the input field or its immediate wrapper, not the whole form group to avoid shaking labels
  const shakeTarget = field.parentElement;
  shakeTarget.classList.remove('animate-shake');
  void shakeTarget.offsetWidth; // Trigger reflow
  shakeTarget.style.animation = 'shake 0.4s var(--ease-spring)';

  const errorEl = document.createElement('span');
  errorEl.className = 'form-error animate-fade-in-down';
  errorEl.textContent = message;
  target.appendChild(errorEl);
}

function clearFormErrors(form) {
  if (!form) return;
  form.querySelectorAll('.error').forEach(f => f.classList.remove('error'));
  form.querySelectorAll('.form-group, .input-group').forEach(el => el.style.animation = '');
  form.querySelectorAll('.form-error').forEach(e => e.remove());
}

function setButtonLoading(btn, loading) {
  if (!btn) return;
  if (loading) {
    btn.classList.add('loading');
    btn.dataset.originalText = btn.innerHTML;
    btn.innerHTML = `<span class="spinner"></span><span class="btn-text">${btn.textContent}</span>`;
    btn.disabled = true;
  } else {
    btn.classList.remove('loading');
    btn.disabled = false;
    if (btn.dataset.originalText) btn.innerHTML = btn.dataset.originalText;
  }
}

function initPasswordToggle() {
  document.querySelectorAll('.password-toggle').forEach(btn => {
    btn.innerHTML = Icons.eye || '';
    btn.addEventListener('click', () => {
      const input = btn.parentElement.querySelector('input');
      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      btn.innerHTML = isPassword ? (Icons.eyeOff || Icons.eye) : Icons.eye;
    });
  });
}

/* ── Ripple Effect ── */

/* ── Modal Manager ── */
const Modal = {
  open(id) {
    const backdrop = document.getElementById(id);
    if (backdrop) {
      backdrop.classList.add('active');
      document.body.style.overflow = 'hidden';

      // Focus first input if any
      const firstInput = backdrop.querySelector('input, select, textarea');
      if (firstInput) setTimeout(() => firstInput.focus(), 100);
    }
  },
  close(id) {
    const backdrop = document.getElementById(id);
    if (backdrop) {
      backdrop.classList.remove('active');
      document.body.style.overflow = '';
    }
  },
  init() {
    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) {
          backdrop.classList.remove('active');
          document.body.style.overflow = '';
        }
      });
    });
    // ESC key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-backdrop.active').forEach(m => {
          m.classList.remove('active');
          document.body.style.overflow = '';
        });
      }
    });
  }
};

/* ── Sidebar Manager ── */
const Sidebar = {
  init() {
    const toggle = document.querySelector('.sidebar-toggle');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    if (!toggle || !sidebar) return;

    toggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      overlay?.classList.toggle('active');
    });
    if (overlay) {
      overlay.addEventListener('click', () => {
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
      });
    }

    // Mark active nav link
    const currentPage = window.location.pathname.split('/').pop() || 'dashboard.html';
    document.querySelectorAll('.nav-link').forEach(link => {
      const href = link.getAttribute('href');
      if (href && href.includes(currentPage)) {
        link.classList.add('active');
      }
    });

    this.updateUserInfo();
  },
  updateUserInfo() {
    const user = getCurrentUser();
    if (!user) return;

    const sidebarName = document.querySelector('.sidebar-user-name');
    const sidebarAvatar = document.querySelector('.sidebar-user .avatar');

    if (sidebarName) sidebarName.textContent = user.name || 'User';
    if (sidebarAvatar) {
      sidebarAvatar.textContent = Utils.getInitials(user.name || 'User');
      sidebarAvatar.style.background = Utils.getAvatarColor(user.name || 'User');
    }

    // Update Top Bar User Dropdown
    const topAvatar = document.getElementById('topBarAvatar');
    const dropName = document.getElementById('dropdownUserName');
    const dropEmail = document.getElementById('dropdownUserEmail');

    if (topAvatar) {
      topAvatar.textContent = Utils.getInitials(user.name || 'User');
      topAvatar.style.background = Utils.getAvatarColor(user.name || 'User');
    }
    if (dropName) dropName.textContent = user.name || 'User';
    if (dropEmail) dropEmail.textContent = user.email || 'email@example.com';
  }
};


/* ── Authentication Helper ── */
const Auth = {
  user() {
    return DB.get('user');
  },

  logout() {
    if (confirm('Are you sure you want to sign out of your FinSmart account?')) {
      DB.remove('user');
      DB.remove('settings');
      const path = window.location.pathname.toLowerCase();
      const loginPath = path.includes('/pages/') ? 'login.html' : 'pages/login.html';
      window.location.href = loginPath;
    }
  },

  // Global Auth Guard — call this on every protected page!
  guard() {
    const user = this.user();
    const path = window.location.pathname.toLowerCase();

    const isLanding = path === '/' || path.endsWith('/index.html') || path.endsWith('frontend/') || path.endsWith('frontend/index.html');
    const isAuthPage = path.includes('login.html') || path.includes('signup.html');

    // Core protection logic for dashboard and other private pages
    if (!user && !isLanding && !isAuthPage) {
      console.warn('Unauthorized access. Redirecting...');
      const loginPath = path.includes('/pages/') ? 'login.html' : 'pages/login.html';
      window.location.href = loginPath;
      return false;
    }

    // Redirect logged-in users away from login/signup/reset pages
    if (user && isAuthPage) {
      const dashPath = path.includes('/pages/') ? 'dashboard.html' : 'pages/dashboard.html';
      window.location.href = dashPath;
      return false;
    }

    return true;
  }
};

// Re-map for backward compatibility
function getCurrentUser() {
  return Auth.user();
}
function logout() {
  Auth.logout();
}

function renderStatusBadge(status) {
  if (!status) return '';
  const s = status.toLowerCase();
  const classes = {
    active: 'badge-primary',
    overdue: 'badge-danger',
    closed: 'badge-success',
    pending: 'badge-warning'
  };
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  return `<span class="badge ${classes[s] || 'badge-neutral'}">${label}</span>`;
}


function renderRiskBadge(risk) {
  if (!risk) return '';
  const classes = {
    low: 'badge-success',
    medium: 'badge-warning',
    high: 'badge-danger'
  };
  const label = risk.level.charAt(0).toUpperCase() + risk.level.slice(1);
  return `<span class="badge ${classes[risk.level] || 'badge-neutral'}" title="${risk.reason}">
    ${label} (${risk.score})
  </span>`;
}


function setStatValue(id, value, animate = true) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = value;
  el.classList.remove('skeleton', 'skeleton-text');
  if (animate) {
    el.classList.remove('fadeIn');
    void el.offsetWidth; // trigger reflow
    el.style.animation = 'fadeIn var(--duration-normal) var(--ease-out)';
  }
}


/* ── Keyboard Shortcuts ── */
function initKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + K → focus search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      const search = document.getElementById('globalSearchInput');
      if (search) search.focus();
    }
    // Alt + N → Toggle Notifications
    if (e.altKey && e.key === 'n') {
      e.preventDefault();
      const bell = document.querySelector('.notification-center .dropdown-toggle');
      if (bell) bell.click();
    }
    // Ctrl/Cmd + D → toggle dark mode
    if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
      e.preventDefault();
      Theme.toggle();
      Toast.info(`Switched to ${Theme.get()} mode`);
    }
  });

  // Theme toggle button click listener
  document.addEventListener('click', (e) => {
    const themeBtn = e.target.closest('.theme-toggle-btn');
    if (themeBtn) {
      e.preventDefault();
      const currentTheme = Theme.get();
      Theme.toggle();
      const newTheme = Theme.get();

      // Animate the button icon
      themeBtn.style.transform = 'rotate(360deg) scale(0)';
      setTimeout(() => {
        themeBtn.style.transform = '';
      }, 400);

      if (currentTheme !== newTheme) {
        Toast.info(`${newTheme.charAt(0).toUpperCase() + newTheme.slice(1)} mode enabled`);
      }
    }
  });
}

/* ── Global Init ── */
document.addEventListener('DOMContentLoaded', () => {
  if (!Auth.guard()) return; // Stop if redirecting

  Theme.init();

  Modal.init();
  Sidebar.init();
  initRippleEffect();
  hidePageLoader();
  initKeyboardShortcuts();
  initPasswordToggle();
  initNotifications();
  initDropdowns();
  initGlobalSearch();
  initLandingNav();
});

/* ── Notification System ── */
async function initNotifications() {
  const center = document.getElementById('notificationCenter');
  if (!center) return;

  const list = document.getElementById('notificationList');
  const badge = document.getElementById('unreadCount');
  const user = getCurrentUser();
  if (!user) return;

  // Load read notifications from localStorage
  const getReadIds = () => {
    const saved = localStorage.getItem(`finsmart-read-notif-${user.id}`);
    return saved ? JSON.parse(saved) : [];
  };

  const saveReadId = (id) => {
    const readIds = getReadIds();
    if (!readIds.includes(id)) {
      readIds.push(id);
      // Keep only last 100 to avoid bloat
      if (readIds.length > 100) readIds.shift();
      localStorage.setItem(`finsmart-read-notif-${user.id}`, JSON.stringify(readIds));
    }
  };

  // Handle Mark All Read
  const markAllReadBtn = document.getElementById('markAllRead');
  if (markAllReadBtn) {
    markAllReadBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();

      const readIds = getReadIds();
      document.querySelectorAll('.notification-item.unread').forEach(item => {
        const id = item.dataset.id;
        if (id && !readIds.includes(id)) readIds.push(id);
        item.classList.remove('unread');
      });
      localStorage.setItem(`finsmart-read-notif-${user.id}`, JSON.stringify(readIds));

      if (badge) {
        badge.style.display = 'none';
        badge.classList.remove('animate-pulse');
      }
      center.classList.remove('has-unread');
      Toast.success('All notifications marked as read');
    };
  }

  try {
    const userId = user.id;
    if (!userId) return;

    // Fetch data in parallel for efficiency
    // We look 14 days ahead for upcoming to give more context
    const [upcoming, persons] = await Promise.all([
      API.payments.getUpcoming(userId, 14),
      API.persons.getAll(userId)
    ]);

    const readIds = getReadIds();
    const overdue = (persons || []).filter(p => p.status === 'overdue');

    // Create a unified alerts list
    const alerts = [
      ...overdue.map(p => ({
        id: `ov-${p.id}`,
        personId: p.id,
        title: 'Payment Overdue',
        text: `<strong>${p.name}</strong> is behind on payments. Action required!`,
        time: 'Overdue Now',
        type: 'error',
        icon: 'alert',
        unread: !readIds.includes(`ov-${p.id}`)
      })),
      ...upcoming.map(p => {
        const id = `up-${p.person_id}-${p.next_due}`;
        return {
          id: id,
          personId: p.person_id,
          title: p.is_overdue ? 'Critical Overdue' : 'Upcoming Due',
          text: `<strong>${p.person_name}</strong>: ${p.is_overdue ? 'Payment missed' : 'Payment due'} for ${Utils.formatCurrency(p.amount)}`,
          time: Utils.formatDateRelative(p.next_due),
          type: p.is_overdue ? 'error' : 'info',
          icon: p.is_overdue ? 'alert' : 'calendar',
          unread: !readIds.includes(id)
        };
      })
    ];

    // Remove duplicates (sometimes upcoming and overdue overlap)
    const uniqueAlerts = [];
    const seenIds = new Set();
    alerts.forEach(a => {
      if (!seenIds.has(a.id)) {
        uniqueAlerts.push(a);
        seenIds.add(a.id);
      }
    });

    if (uniqueAlerts.length === 0) {
      center.classList.remove('has-unread');
      list.innerHTML = `
        <div class="notification-empty">
          <div class="notification-empty-icon text-primary">✨</div>
          <div class="notification-empty-title">You're all caught up!</div>
          <div class="notification-empty-text">No new alerts to show right now</div>
        </div>
      `;
      if (badge) badge.style.display = 'none';
    } else {
      const unreadCount = uniqueAlerts.filter(a => a.unread).length;

      if (unreadCount > 0) {
        center.classList.add('has-unread');
        if (badge) {
          badge.textContent = unreadCount;
          badge.style.display = 'flex';
          badge.classList.add('animate-pulse');
        }
      } else {
        center.classList.remove('has-unread');
        if (badge) badge.style.display = 'none';
      }

      list.innerHTML = uniqueAlerts.map(a => `
        <div class="notification-item ${a.type} ${a.unread ? 'unread' : ''}" 
             data-id="${a.id}" 
             data-person-id="${a.personId}"
             role="button"
             tabindex="0">
          <div class="notification-icon">
             <span data-icon="${a.icon}"></span>
          </div>
          <div class="notification-content">
            <p>${a.title}</p>
            <p style="font-size: var(--text-xs); color: var(--text-secondary); opacity: 0.9;">${a.text}</p>
            <small>${a.time}</small>
          </div>
        </div>
      `).join('');

      // Inject icons
      list.querySelectorAll('[data-icon]').forEach(el => {
        el.innerHTML = Icons[el.dataset.icon] || '';
      });

      // Unified click handler for items
      list.querySelectorAll('.notification-item').forEach(item => {
        item.addEventListener('click', (e) => {
          const id = item.dataset.id;
          const personId = item.dataset.personId;

          // Mark as read visually and persist
          if (item.classList.contains('unread')) {
            saveReadId(id);
            item.classList.remove('unread');
            const remaining = list.querySelectorAll('.notification-item.unread').length;
            if (badge) {
              if (remaining > 0) {
                badge.textContent = remaining;
              } else {
                badge.style.display = 'none';
                center.classList.remove('has-unread');
              }
            }
          }

          // Navigate to borrower detail
          if (personId) {
            window.location.href = `person-detail.html?id=${personId}`;
          }
        });
      });
    }
  } catch (err) {
    console.error('Notification Error:', err);
    list.innerHTML = `
      <div class="notification-empty">
        <div class="notification-empty-icon text-danger">⚠️</div>
        <div class="notification-empty-title">Connection Error</div>
        <div class="notification-empty-text">Failed to fetch recent alerts</div>
      </div>
    `;
  }
}

function initDropdowns() {
  document.querySelectorAll('.dropdown-toggle').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const parent = btn.closest('.dropdown');
      const wasOpen = parent.classList.contains('open');
      document.querySelectorAll('.dropdown').forEach(d => d.classList.remove('open'));
      if (!wasOpen) parent.classList.add('open');
    });
  });

  document.addEventListener('click', () => {
    document.querySelectorAll('.dropdown').forEach(d => d.classList.remove('open'));
  });
}

function initLandingNav() {
  const toggle = document.getElementById('mobileNavToggle');
  const nav = document.querySelector('.landing-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      nav.classList.toggle('open');
    });
  }
}

function initGlobalSearch() {
  const input = document.getElementById('globalSearchInput');
  const results = document.getElementById('globalSearchResults');
  if (!input || !results) return;

  const performSearch = Utils.debounce(async (query) => {
    if (query.length < 2) {
      results.innerHTML = '';
      results.classList.remove('active');
      return;
    }

    const user = getCurrentUser();
    if (!user) return;

    try {
      const persons = await API.persons.getAll(user.id, query);
      results.classList.add('active');

      if (persons.length === 0) {
        results.innerHTML = `<div class="search-empty">No borrowers found matching "${query}"</div>`;
      } else {
        results.innerHTML = persons.slice(0, 8).map(p => {
          const initials = Utils.getInitials(p.name);
          const color = Utils.getAvatarColor(p.name);
          return `
            <a href="person-detail.html?id=${p.id}" class="search-result-item">
              <div class="search-result-avatar" style="background:${color}">${initials}</div>
              <div class="search-result-info">
                <span class="search-result-name">${p.name}</span>
                <span class="search-result-meta">${p.phone} • ${Utils.formatCurrency(p.given_amount)}</span>
              </div>
            </a>
          `;
        }).join('');
      }
    } catch (err) {
      results.innerHTML = `<div class="search-empty text-danger">Search error</div>`;
    }
  }, 200);

  input.addEventListener('input', (e) => performSearch(e.target.value));

  input.addEventListener('focus', () => {
    if (input.value.length >= 2) results.classList.add('active');
  });

  // Close search results on click outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.global-search')) {
      results.classList.remove('active');
    }
  });
}

function hidePageLoader() {
  const loader = document.getElementById('pageLoader');
  if (loader) {
    loader.classList.add('hidden');
    setTimeout(() => loader.remove(), 400);
  }
}


function initRippleEffect() {
  document.addEventListener('mousedown', (e) => {
    const target = e.target.closest('.ripple');
    if (!target) return;

    const rect = target.getBoundingClientRect();
    const ripple = document.createElement('span');
    ripple.className = 'ripple-effect';

    const size = Math.max(rect.width, rect.height);
    ripple.style.width = ripple.style.height = `${size}px`;

    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;

    target.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove());
  });
}








