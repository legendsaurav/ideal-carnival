// Alumni search frontend module
// Usage: import { initAlumniSearch } from './alumni_search.js';
// then call initAlumniSearch('#alumni-modal') where the modal contains the expected DOM.

function escapeHtml(str) {
    if (!str && str !== 0) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function debounce(fn, ms) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

export function initAlumniSearch(rootSelector) {
    const root = document.querySelector(rootSelector);
    if (!root) return;

    const input = root.querySelector('#alumni-search-input');
    const resultsContainer = root.querySelector('#alumni-results');
    const statusEl = root.querySelector('#alumni-search-status');
    if (!input || !resultsContainer) return;

    const setStatus = (msg) => { if (statusEl) statusEl.textContent = msg; };

    const renderResults = (items) => {
        resultsContainer.innerHTML = '';
        if (!items || items.length === 0) {
            resultsContainer.innerHTML = '<div class="alumni-empty">No results</div>';
            return;
        }
        const grid = document.createElement('div');
        grid.className = 'alumni-results-grid';
        for (const it of items) {
            const name = escapeHtml(it.name || it.title || 'Unknown');
            const title = escapeHtml(it.title || it.position || '');
            const snippet = escapeHtml(it.snippet || it.summary || '');
            const url = it.url ? escapeHtml(it.url) : null;

            const initials = name.split(' ').map(s=>s[0]||'').slice(0,2).join('').toUpperCase() || '?';

            const card = document.createElement('div');
            card.className = 'alumni-card';
            card.innerHTML = `
                <div class="alumni-card-left"><div class="alumni-avatar">${initials}</div></div>
                <div class="alumni-card-main">
                    <div class="alumni-card-header">
                        <div class="alumni-name">${name}</div>
                        ${url ? `<a class="alumni-link" href="${url}" target="_blank" rel="noopener noreferrer" aria-label="Open profile">🔗</a>` : ''}
                    </div>
                    <div class="alumni-title">${title}</div>
                    <div class="alumni-snippet">${snippet}</div>
                </div>
            `;
            grid.appendChild(card);
        }
        resultsContainer.appendChild(grid);
    };

    const doSearch = async (q) => {
        if (!q || q.trim().length === 0) { renderResults([]); setStatus(''); return; }
        setStatus('Searching...');
        resultsContainer.innerHTML = '';
        try {
            const res = await fetch('https://lol-j8ni.onrender.com/api/alumni_search', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: q, max: 10 })
            });
            const json = await res.json();
            if (!res.ok) {
                setStatus(json && json.error ? json.error : 'Search failed');
                renderResults([]);
                return;
            }
            const items = json.results || [];
            setStatus('');
            renderResults(items);
        } catch (err) {
            console.error('Alumni search error', err);
            setStatus('Error searching');
            renderResults([]);
        }
    };

    const debounced = debounce((e) => doSearch(e.target.value), 400);
    input.addEventListener('input', debounced);

    // Optional: support pressing Enter
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); doSearch(input.value); } });

    // initial empty state
    renderResults([]);
}

// If used as a script tag, auto-init any modal with id #alumni-modal
if (typeof window !== 'undefined') {
    window.initAlumniSearch = initAlumniSearch;
}
