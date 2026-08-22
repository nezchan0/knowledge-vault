/* ============================================
   Knowledge Vault — Topics Page
   ============================================ */

(function () {
  'use strict';

  const themeToggle = document.getElementById('theme-toggle');

  function initTheme() {
    const saved = localStorage.getItem('kv-theme');
    if (saved) {
      document.documentElement.setAttribute('data-theme', saved);
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('kv-theme', next);
  }

  themeToggle.addEventListener('click', toggleTheme);

  initTheme();
})();
