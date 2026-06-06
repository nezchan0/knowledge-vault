/* ============================================
   Knowledge Vault — Note Viewer
   ============================================ */

(function () {
  'use strict';

  // ---- DOM refs ----
  const noteViewer = document.getElementById('note-viewer');
  const loadingEl = document.getElementById('loading');
  const themeToggle = document.getElementById('theme-toggle');

  // ---- Theme ----
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

  // ---- Helpers ----
  function getSlug() {
    const params = new URLSearchParams(window.location.search);
    return params.get('slug');
  }

  function formatDate(dateStr) {
    try {
      const d = new Date(dateStr + 'T00:00:00');
      return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch {
      return dateStr;
    }
  }

  function escapeHTML(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  // ---- Render error state ----
  function renderError(title, message) {
    loadingEl.style.display = 'none';
    noteViewer.innerHTML = `
      <div class="note-error">
        <div class="note-error__icon">📄</div>
        <h2 class="note-error__title">${escapeHTML(title)}</h2>
        <p class="note-error__text">${escapeHTML(message)}</p>
        <a href="index.html" class="note-error__link">
          ← Back to All Notes
        </a>
      </div>
    `;
  }

  // ---- Render note ----
  function renderNote(meta, bodyHTML) {
    const tagsHTML = (meta.tags || []).map(t =>
      '<span class="tag">#' + escapeHTML(t) + '</span>'
    ).join('');

    loadingEl.style.display = 'none';

    // Update page title
    document.title = meta.title + ' — Knowledge Vault';

    noteViewer.innerHTML = `
      <a href="index.html" class="back-button" id="back-button">
        <span class="back-button__icon">←</span>
        <span>All Notes</span>
      </a>

      <header class="note-header">
        <h1 class="note-header__title">${escapeHTML(meta.title)}</h1>
        <div class="note-header__meta">
          <span class="note-header__date">📅 ${formatDate(meta.date)}</span>
          <span class="note-header__type" data-type="${escapeHTML(meta.type || '')}">${escapeHTML(meta.type || '')}</span>
        </div>
        <div class="note-header__tags">${tagsHTML}</div>
      </header>

      <article class="note-content" id="note-content">
        ${bodyHTML}
      </article>
    `;
  }

  // ---- Load note ----
  async function loadNote() {
    const slug = getSlug();

    if (!slug) {
      renderError('No note specified', 'Please select a note from the homepage.');
      return;
    }

    // Load index to find the file path
    let index = [];
    try {
      const resp = await fetch('data/index.json');
      if (!resp.ok) throw new Error('Failed to load index');
      index = await resp.json();
    } catch (err) {
      renderError('Could not load index', 'The notes index could not be loaded.');
      return;
    }

    // Find matching note
    const entry = index.find(n => n.slug === slug);

    if (!entry) {
      renderError('Note not found', 'No note with slug "' + slug + '" was found.');
      return;
    }

    // Load the content file
    try {
      const resp = await fetch(entry.file);
      if (!resp.ok) throw new Error('Failed to load note file');
      const html = await resp.text();

      // Parse the HTML to extract metadata and body
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      // Extract metadata
      const metaScript = doc.querySelector('script#metadata[type="application/json"]');
      let meta = entry; // Fallback to index metadata
      if (metaScript) {
        try {
          meta = JSON.parse(metaScript.textContent);
        } catch {
          // Use index metadata as fallback
        }
        // Remove the metadata script
        metaScript.remove();
      }

      // Get the remaining body HTML
      const bodyHTML = doc.body ? doc.body.innerHTML.trim() : '';

      renderNote(meta, bodyHTML);
    } catch (err) {
      renderError('Could not load note', 'The note file could not be loaded: ' + err.message);
    }
  }

  // ---- Event listeners ----
  themeToggle.addEventListener('click', toggleTheme);

  // ---- Init ----
  initTheme();
  loadNote();
})();
