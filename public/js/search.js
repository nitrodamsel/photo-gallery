/**
 * search.js — client-side progressive enhancement for the search page.
 *
 * Features:
 *  - Debounced search-as-you-type (300 ms) via fetch → GET /api/search
 *  - Updates the results grid without a full page reload
 *  - Syncs the browser URL with history.pushState
 *  - Degrades gracefully: the plain <form> still works without JS
 */

(function () {
  'use strict';

  // ── Config ──────────────────────────────────────────────────────────────────
  const DEBOUNCE_MS  = 300;
  const RESULTS_GRID = document.getElementById('search-results-grid');
  const FILTER_FORM  = document.getElementById('filter-form');

  if (!RESULTS_GRID || !FILTER_FORM) return; // not on search page

  // ── State ────────────────────────────────────────────────────────────────────
  let debounceTimer  = null;
  let currentRequest = null; // AbortController

  // ── Boot ─────────────────────────────────────────────────────────────────────

  // Listen to input events on the keyword field for live search
  const qInput = FILTER_FORM.querySelector('[name="q"]');
  if (qInput) {
    qInput.addEventListener('input', () => debouncedSearch());
  }

  // Intercept form submit to use fetch instead of full reload on capable browsers
  FILTER_FORM.addEventListener('submit', (e) => {
    e.preventDefault();
    runSearch();
  });

  // Handle browser back/forward
  window.addEventListener('popstate', (e) => {
    if (e.state && e.state.searchParams) {
      applyParamsToForm(new URLSearchParams(e.state.searchParams));
      fetchAndRender(e.state.searchParams, false /* don't pushState again */);
    }
  });

  // ── Debounce ─────────────────────────────────────────────────────────────────

  function debouncedSearch() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(runSearch, DEBOUNCE_MS);
  }

  // ── Core ──────────────────────────────────────────────────────────────────────

  function runSearch() {
    const params = serializeForm(FILTER_FORM);
    // Reset to page 1 on new search
    params.delete('page');
    fetchAndRender(params.toString(), true);
  }

  async function fetchAndRender(queryString, pushToHistory) {
    // Abort any in-flight request
    if (currentRequest) currentRequest.abort();
    currentRequest = new AbortController();

    showLoading();

    try {
      const url = `/api/search?${queryString}`;
      const res = await fetch(url, { signal: currentRequest.signal });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();

      renderResults(data);
      updateResultCount(data.pagination);
      updateFilterSummary(data.filters);
      updatePagination(data.pagination, queryString);

      if (pushToHistory) {
        const newUrl = `/search?${queryString}`;
        history.pushState({ searchParams: queryString }, '', newUrl);
      }
    } catch (err) {
      if (err.name === 'AbortError') return; // intentional cancel
      console.error('[search.js] fetch error:', err);
      showError();
    } finally {
      hideLoading();
    }
  }

  // ── Rendering ─────────────────────────────────────────────────────────────────

  function renderResults(data) {
    const { results } = data;

    if (!results || results.length === 0) {
      RESULTS_GRID.innerHTML = buildEmptyState(data.filters);
      return;
    }

    RESULTS_GRID.innerHTML = results.map(buildImageCard).join('');
  }

  function buildImageCard(image) {
    const thumbUrl = `/uploads/thumbnails/${image.filename}`;
    const imgUrl   = `/uploads/${image.filename}`;
    const detailUrl = `/image/${image.id}`;
    const name     = escapeHtml(image.originalName || image.filename);
    const tags     = (image.tags || [])
      .map((t) => `<a href="/search?tags=${encodeURIComponent(t.slug || t.name)}"
                       class="badge bg-secondary text-decoration-none me-1">${escapeHtml(t.name)}</a>`)
      .join('');

    return `
      <div class="col">
        <div class="card h-100 image-card shadow-sm">
          <a href="${detailUrl}" class="card-img-link">
            <img
              src="${thumbUrl}"
              class="card-img-top object-fit-cover"
              style="height:180px;"
              alt="${name}"
              loading="lazy"
              onerror="this.src='${imgUrl}'"
            >
          </a>
          <div class="card-body p-2">
            <p class="card-text small text-truncate mb-1" title="${name}">${name}</p>
            <div class="d-flex flex-wrap gap-1">${tags}</div>
          </div>
        </div>
      </div>
    `;
  }

  function buildEmptyState(filters) {
    const hasFilters = filters && (
      filters.q || (filters.tags && filters.tags.length) ||
      filters.dateFrom || filters.dateTo || filters.cameraMake || filters.hasGps
    );

    return `
      <div class="col-12">
        <div class="text-center py-5">
          <i class="bi bi-images display-1 text-muted"></i>
          <h4 class="mt-3">No images found</h4>
          <p class="text-muted">
            ${hasFilters
              ? 'Try adjusting your filters or <a href="/search">clear all filters</a>.'
              : 'Upload some images to get started.'}
          </p>
          <a href="/gallery" class="btn btn-outline-primary mt-2">
            <i class="bi bi-images me-1"></i>Browse Gallery
          </a>
        </div>
      </div>
    `;
  }

  // ── Result count ──────────────────────────────────────────────────────────────

  function updateResultCount(pagination) {
    const el = document.querySelector('.text-muted.mb-0');
    if (!el) return;
    const { count } = pagination;
    el.innerHTML = count !== undefined
      ? `Found <strong>${count}</strong> result${count !== 1 ? 's' : ''}`
      : '';
  }

  // ── Filter summary badges ─────────────────────────────────────────────────────

  function updateFilterSummary(filters) {
    const container = document.getElementById('filter-summary');
    if (!container) return;

    const labels = buildFilterLabels(filters);
    if (labels.length === 0) {
      container.innerHTML = '';
      return;
    }

    const badges = labels
      .map((l) => `<span class="badge bg-secondary">${escapeHtml(l)}</span>`)
      .join('');

    container.innerHTML =
      badges +
      `<a href="/search" class="badge bg-outline-secondary text-secondary border border-secondary text-decoration-none">Clear all</a>`;
  }

  function buildFilterLabels(f) {
    const out = [];
    if (f.q)                                         out.push(`Search: "${f.q}"`);
    if (f.dateFrom && f.dateTo)                      out.push(`Date: ${f.dateFrom} — ${f.dateTo}`);
    else if (f.dateFrom)                             out.push(`From: ${f.dateFrom}`);
    else if (f.dateTo)                               out.push(`To: ${f.dateTo}`);
    if (f.cameraMake)                                out.push(`Camera: ${f.cameraMake}`);
    if (f.hasGps)                                    out.push('Has GPS');
    if (f.tags && f.tags.length)                     out.push(`Tags: ${f.tags.join(', ')}`);
    return out;
  }

  // ── Pagination ────────────────────────────────────────────────────────────────

  function updatePagination(pagination, baseQuery) {
    const existingNav = document.querySelector('nav[aria-label="Search results pagination"]');
    const { page, totalPages } = pagination;

    if (totalPages <= 1) {
      if (existingNav) existingNav.remove();
      return;
    }

    const params = new URLSearchParams(baseQuery);
    const buildHref = (p) => {
      params.set('page', p);
      return `/search?${params.toString()}`;
    };
    const buildFetch = (p) => {
      params.set('page', p);
      return params.toString();
    };

    const items = [];

    // Prev
    items.push(
      page <= 1
        ? `<li class="page-item disabled"><span class="page-link"><i class="bi bi-chevron-left"></i></span></li>`
        : `<li class="page-item"><a class="page-link" href="${buildHref(page - 1)}" data-page="${page - 1}" data-query="${escapeHtml(buildFetch(page - 1))}"><i class="bi bi-chevron-left"></i></a></li>`
    );

    for (let p = 1; p <= totalPages; p++) {
      if (p === 1 || p === totalPages || (p >= page - 2 && p <= page + 2)) {
        if (p === page - 3 || p === page + 3) {
          items.push(`<li class="page-item disabled"><span class="page-link">…</span></li>`);
        }
        items.push(
          p === page
            ? `<li class="page-item active"><span class="page-link">${p}</span></li>`
            : `<li class="page-item"><a class="page-link" href="${buildHref(p)}" data-page="${p}" data-query="${escapeHtml(buildFetch(p))}">${p}</a></li>`
        );
      }
    }

    // Next
    items.push(
      page >= totalPages
        ? `<li class="page-item disabled"><span class="page-link"><i class="bi bi-chevron-right"></i></span></li>`
        : `<li class="page-item"><a class="page-link" href="${buildHref(page + 1)}" data-page="${page + 1}" data-query="${escapeHtml(buildFetch(page + 1))}"><i class="bi bi-chevron-right"></i></a></li>`
    );

    const nav = document.createElement('nav');
    nav.setAttribute('aria-label', 'Search results pagination');
    nav.className = 'mt-4';
    nav.innerHTML = `<ul class="pagination justify-content-center flex-wrap">${items.join('')}</ul>`;

    // Attach click handlers
    nav.querySelectorAll('a.page-link[data-query]').forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const q = link.dataset.query;
        fetchAndRender(q, true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });

    if (existingNav) {
      existingNav.replaceWith(nav);
    } else {
      RESULTS_GRID.closest('.col-12.col-lg-9, .col').parentElement.appendChild(nav);
    }
  }

  // ── Loading / error states ────────────────────────────────────────────────────

  function showLoading() {
    RESULTS_GRID.style.opacity = '0.4';
    RESULTS_GRID.style.pointerEvents = 'none';
  }

  function hideLoading() {
    RESULTS_GRID.style.opacity = '';
    RESULTS_GRID.style.pointerEvents = '';
  }

  function showError() {
    RESULTS_GRID.innerHTML = `
      <div class="col-12">
        <div class="alert alert-danger" role="alert">
          <i class="bi bi-exclamation-triangle me-2"></i>
          Something went wrong while fetching results. Please try again.
        </div>
      </div>
    `;
  }

  // ── Form helpers ──────────────────────────────────────────────────────────────

  /**
   * Serialises the filter form into a URLSearchParams object,
   * correctly handling multiple checkboxes with the same name (tags).
   */
  function serializeForm(form) {
    return new URLSearchParams(new FormData(form));
  }

  /**
   * Populates form fields from a URLSearchParams object.
   * Used when restoring state from popstate.
   */
  function applyParamsToForm(params) {
    // Text / date / select inputs
    ['q', 'dateFrom', 'dateTo', 'cameraMake'].forEach((name) => {
      const el = FILTER_FORM.querySelector(`[name="${name}"]`);
      if (el) el.value = params.get(name) || '';
    });

    // Checkbox: hasGps
    const gpsEl = FILTER_FORM.querySelector('[name="hasGps"]');
    if (gpsEl) gpsEl.checked = params.has('hasGps');

    // Checkboxes: tags
    const tagValues = params.getAll('tags');
    FILTER_FORM.querySelectorAll('[name="tags"]').forEach((cb) => {
      cb.checked = tagValues.includes(cb.value);
    });
  }

  // ── Utils ─────────────────────────────────────────────────────────────────────

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
})();