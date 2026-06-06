/* ============================================
   Knowledge Vault — Homepage App
   ============================================ */

(function () {
  'use strict';

  // ---- Constants ----
  const TYPES = ['dsa','learning', 'journal', 'project', 'book', 'question', 'revision', 'philosophy'];
  const TYPE_LABELS = {
    dsa: '🧠 DSA',
    learning: '📚 Learning',
    journal: '📓 Journal',
    project: '🚀 Project',
    book: '📖 Book',
    question: '❓ Question',
    revision: '🔄 Revision',
    philosophy: '💡 Philosophy'
  };

  // ---- State ----
  let allNotes = [];
  let activeTypes = new Set();
  let activeTags = new Set();
  let searchQuery = '';
  let sortDirection = 'desc'; // 'desc' = newest first, 'asc' = oldest first
  let dateFrom = '';
  let dateTo = '';

  // ---- DOM refs ----
  const searchInput = document.getElementById('search-input');
  const typeChipsContainer = document.getElementById('type-chips');
  const tagChipsContainer = document.getElementById('tag-chips');
  const notesGrid = document.getElementById('notes-grid');
  const loadingEl = document.getElementById('loading');
  const noteCountText = document.getElementById('note-count-text');
  const themeToggle = document.getElementById('theme-toggle');
  const dateFromInput = document.getElementById('date-from');
  const dateToInput = document.getElementById('date-to');
  const dateClearBtn = document.getElementById('date-clear');
  const sortToggleBtn = document.getElementById('sort-toggle');
  const sortIcon = document.getElementById('sort-icon');
  const sortLabel = document.getElementById('sort-label');

  // ---- Theme ----
  function initTheme() {
    const saved = localStorage.getItem('kv-theme');
    if (saved) {
      document.documentElement.setAttribute('data-theme', saved);
    } else {
      // Default to dark
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('kv-theme', next);
  }

  // ---- Helper: format date ----
  function formatDate(dateStr) {
    try {
      const d = new Date(dateStr + 'T00:00:00');
      return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  }

  // ---- Render type filter chips ----
  function renderTypeChips() {
    typeChipsContainer.innerHTML = '';
    TYPES.forEach(type => {
      const chip = document.createElement('button');
      chip.className = 'filter-chip';
      chip.setAttribute('data-type', type);
      chip.textContent = TYPE_LABELS[type] || type;
      chip.addEventListener('click', () => {
        if (activeTypes.has(type)) {
          activeTypes.delete(type);
          chip.classList.remove('active');
        } else {
          activeTypes.add(type);
          chip.classList.add('active');
        }
        renderNotes();
      });
      typeChipsContainer.appendChild(chip);
    });
  }

  // ---- Render tag filter chips ----
  function renderTagChips() {
    const tagSet = new Set();
    allNotes.forEach(note => {
      if (note.tags && Array.isArray(note.tags)) {
        note.tags.forEach(t => tagSet.add(t));
      }
    });

    const sorted = Array.from(tagSet).sort();
    tagChipsContainer.innerHTML = '';

    sorted.forEach(tag => {
      const chip = document.createElement('button');
      chip.className = 'filter-chip';
      chip.textContent = '#' + tag;
      chip.addEventListener('click', () => {
        if (activeTags.has(tag)) {
          activeTags.delete(tag);
          chip.classList.remove('active');
        } else {
          activeTags.add(tag);
          chip.classList.add('active');
        }
        renderNotes();
      });
      tagChipsContainer.appendChild(chip);
    });
  }

  // ---- Filter & search ----
  function getFilteredNotes() {
    let results = [...allNotes];

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      results = results.filter(note => {
        const titleMatch = (note.title || '').toLowerCase().includes(q);
        const summaryMatch = (note.summary || '').toLowerCase().includes(q);
        const tagMatch = (note.tags || []).some(t => t.toLowerCase().includes(q));
        return titleMatch || summaryMatch || tagMatch;
      });
    }

    // Type filter
    if (activeTypes.size > 0) {
      results = results.filter(note => activeTypes.has(note.type));
    }

    // Tag filter
    if (activeTags.size > 0) {
      results = results.filter(note =>
        (note.tags || []).some(t => activeTags.has(t))
      );
    }

    // Date range filter
    if (dateFrom) {
      results = results.filter(note => (note.date || '') >= dateFrom);
    }
    if (dateTo) {
      results = results.filter(note => (note.date || '') <= dateTo);
    }

    // Sort by date
    results.sort((a, b) => {
      const tA = a.timestamp || a.date || '';
      const tB = b.timestamp || b.date || '';
      return sortDirection === 'desc' ? tB.localeCompare(tA) : tA.localeCompare(tB);
    });

    return results;
  }

  // ---- Render note cards ----
  function renderNotes() {
    const filtered = getFilteredNotes();

    // Update count
    noteCountText.textContent = filtered.length + ' note' + (filtered.length !== 1 ? 's' : '');

    notesGrid.innerHTML = '';

    if (filtered.length === 0) {
      notesGrid.innerHTML = `
        <div class="empty-state">
          <div class="empty-state__icon">🔍</div>
          <h3 class="empty-state__title">No notes found</h3>
          <p class="empty-state__text">Try adjusting your search or filters.</p>
        </div>
      `;
      return;
    }

    filtered.forEach((note, i) => {
      const card = document.createElement('a');
      card.href = 'note.html?slug=' + encodeURIComponent(note.slug);
      card.className = 'note-card';
      card.setAttribute('data-type', note.type || '');
      card.style.animationDelay = (i * 50) + 'ms';

      const tagsHTML = (note.tags || []).map(t =>
        '<span class="tag">#' + escapeHTML(t) + '</span>'
      ).join('');

      card.innerHTML = `
        <div class="note-card__header">
          <h2 class="note-card__title">${escapeHTML(note.title)}</h2>
          <span class="note-card__arrow">→</span>
        </div>
        <div class="note-card__meta">
          <span class="note-card__date">${formatDate(note.date)}</span>
          <span class="note-card__type" data-type="${escapeHTML(note.type || '')}">${escapeHTML(note.type || '')}</span>
        </div>
        <p class="note-card__summary">${escapeHTML(note.summary || '')}</p>
        <div class="note-card__tags">${tagsHTML}</div>
      `;

      notesGrid.appendChild(card);
    });
  }

  // ---- Escape HTML ----
  function escapeHTML(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  // ---- Load data ----
  async function loadIndex() {
    try {
      const resp = await fetch('data/index.json');
      if (!resp.ok) throw new Error('Failed to load index.json');
      allNotes = await resp.json();
    } catch (err) {
      console.warn('Could not load index.json:', err);
      allNotes = [];
    }

    loadingEl.style.display = 'none';
    renderTypeChips();
    renderTagChips();
    renderNotes();
  }

  // ---- Event listeners ----
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    renderNotes();
  });

  themeToggle.addEventListener('click', toggleTheme);

  dateFromInput.addEventListener('change', (e) => {
    dateFrom = e.target.value;
    renderNotes();
  });

  dateToInput.addEventListener('change', (e) => {
    dateTo = e.target.value;
    renderNotes();
  });

  dateClearBtn.addEventListener('click', () => {
    dateFrom = '';
    dateTo = '';
    dateFromInput.value = '';
    dateToInput.value = '';
    renderNotes();
  });

  sortToggleBtn.addEventListener('click', () => {
    sortDirection = sortDirection === 'desc' ? 'asc' : 'desc';
    sortIcon.textContent = sortDirection === 'desc' ? '↓' : '↑';
    sortLabel.textContent = sortDirection === 'desc' ? 'Newest First' : 'Oldest First';
    renderNotes();
  });

  // ---- Init ----
  initTheme();
  loadIndex();
})();
