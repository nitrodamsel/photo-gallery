/**
 * Search page client-side enhancements:
 * - Debounced search-as-you-type (300ms)
 * - Updates results grid without full page reload via fetch to /api/search
 * - Syncs browser URL with history.pushState
 */

(function () {
  'use strict';

  // ─── Configuration ──────────────────────────────────────────────────────────
  const DEBOUNCE_DELAY = 300;
  const API_ENDPOINT = '/api/search';

  // ─── State ──────────────────────────────────────────────────────────────────
  let debounceTimer = null;
  let currentController = null; // AbortController for in-flight requests

  // ─── DOM References ─────────────────────────────────────────────────────────
  const searchInput = document.getElementById('searchInput');
  const resultsGrid = document.getElementById('resultsGrid');
  const filterForm = document.getElementById('filterForm');
  const sortSelect = document.getElementById('sortSelect');

  // ─── Initialise ─────────────────────────────────────────────────────────────
  function init() {
    if (!searchInput || !resultsGrid) return;

    // Debounced input on the main search field
    searchInput.addEventListener('input', handleSearchInput);

    // Intercept filter form submission for SPA-style update
    if (filterForm) {
      filterForm.addEventListener('submit', handleFilterSubmit);
    }

    // Handle browser back/forward
    window.addEventListener('popstate', handlePopState);
  }

  // ─── Event Handlers ──────────────────────────────────────────────────────────

  function handleSearchInput() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const params = collectCurrentParams();
      params.set('q', searchInput.value.trim());
      params.delete('page'); // Reset to page 1 on new search
      performSearch(params);
    }, DEBOUNCE_DELAY);
  }

  function handleFilterSubmit(e) {
    e.preventDefault();
    const formData = new FormData(filterForm);
    const params = new URLSearchParams();

    // Include search query from the main input
    const qVal = searchInput ? searchInput.value.trim() : '';
    if (qVal) params.set('q', qVal);

    for (const [key, value] of formData.entries()) {
      if (value !== '') params.append(key, value);
    }

    performSearch(params);
  }

  function handlePopState(event) {
    // Re-run search with the URL params from the history state
    const params = new URLSearchParams(window.location.search);
    if (searchInput) {
      searchInput.value = params.get('q') || '';
    }
    performSearch(params, false /* don't push state again */);
  }

  // ─── Core Search Function ────────────────────────────────────────────────────

  async function performSearch(params, pushState = true) {
    // Cancel any in-flight request
    if (currentController) {
      currentController.abort();
    }
    currentController = new AbortController();

    // Show loading state
    setLoadingState(true);

    // Build API URL
    const apiUrl = `${API_ENDPOINT}?${params.toString()}`;

    try {
      const response = await fetch(apiUrl, {
        signal: currentController.signal,
        headers: { 'Accept': 'application/json' },
      });

      if (!response.ok) throw new Error(`Search failed: ${response.status}`);

      const data = await response.json();

      // Update the results grid
      renderResults(data, params);

      // Update the browser URL
      if (pushState) {
        const newUrl = `${window.location.pathname}?${params.toString()}`;
        history.pushState({ params: params.toString() }, '', newUrl);
      }

      // Update the result count display
      updateResultsCount(data);

    } catch (err) {
      if (err.name === 'AbortError') return; // Request was cancelled — ignore
      console.error('Search error:', err);
      showSearchError();
    } finally {
      setLoadingState(false);
      currentController = null;
    }
  }

  // ─── Rendering ───────────────────────────────────────────────────────────────

  function renderResults(data, params) {
    const { results, pagination } = data;

    if (!results || results.length === 0) {
      resultsGrid.innerHTML = buildNoResultsHTML(params.get('q'));
      return;
    }

    let html = '<div class="row g-3" id="imageGrid">';
    results.forEach((image) => {
      html += `<div class="col-6 col-md-4 col-xl-3">${buildImageCardHTML(image, params.get('q'))}</div>`;
    });
    html += '</div>';

    // Append pagination if needed
    if (pagination && pagination.totalPages > 1) {
      html += buildPaginationHTML(pagination, params);
    }

    resultsGrid.innerHTML = html;
  }

  function buildImageCardHTML(image, searchQuery) {
    const thumbnailSrc = image.thumbnailPath
      ? `/uploads/${image.thumbnailPath}`
      : `/uploads/${image.filename}`;

    const displayName = highlightText(image.originalName || image.filename, searchQuery);
    const tagsHtml = (image.tags || [])
      .slice(0, 3)
      .map(
        (tag) =>
          `<span class="badge" style="background-color:${escapeHtml(tag.color || '#6c757d')};font-size:0.7rem;">${escapeHtml(tag.name)}</span>`
      )
      .join(' ');

    return `
      <div class="card image-card h-100 shadow-sm border-0">
        <a href="/image/${image.id}" class="card-img-link">
          <div class="image-thumb-wrapper">
            <img
              src="${escapeHtml(thumbnailSrc)}"
              alt="${escapeHtml(image.originalName || image.filename)}"
              class="card-img-top image-thumb"
              loading="lazy"
              onerror="this.src='/images/placeholder.png'"
            />
            ${image.latitude ? '<span class="badge bg-success position-absolute top-0 end-0 m-1"><i class="bi bi-geo-alt-fill"></i></span>' : ''}
          </div>
        </a>
        <div class="card-body p-2">
          <p class="card-text small fw-semibold mb-1 text-truncate" title="${escapeHtml(image.originalName || image.filename)}">
            ${displayName}
          </p>
          ${tagsHtml ? `<div class="d-flex flex-wrap gap-1">${tagsHtml}</div>` : ''}
        </div>
      </div>
    `;
  }

  function buildPaginationHTML(pagination, params) {
    const { page, totalPages } = pagination;
    let html = '<nav aria-label="Search pagination" class="mt-4"><ul class="pagination justify-content-center">';

    // Previous
    html += `<li class="page-item ${page <= 1 ? 'disabled' : ''}">
      <a class="page-link" href="#" data-page="${page - 1}"><i class="bi bi-chevron-left"></i></a>
    </li>`;

    // Pages
    const startPage = Math.max(1, page - 2);
    const endPage = Math.min(totalPages, page + 2);

    if (startPage > 1) {
      html += `<li class="page-item"><a class="page-link" href="#" data-page="1">1</a></li>`;
      if (startPage > 2) html += `<li class="page-item disabled"><span class="page-link">…</span></li>`;
    }

    for (let p = startPage; p <= endPage; p++) {
      html += `<li class="page-item ${p === page ? 'active' : ''}">
        <a class="page-link" href="#" data-page="${p}">${p}</a>
      </li>`;
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) html += `<li class="page-item disabled"><span class="page-link">…</span></li>`;
      html += `<li class="page-item"><a class="page-link" href="#" data-page="${totalPages}">${totalPages}</a></li>`;
    }

    // Next
    html += `<li class="page-item ${page >= totalPages ? 'disabled' : ''}">
      <a class="page-link" href="#" data-page="${page + 1}"><i class="bi bi-chevron-right"></i></a>
    </li>`;

    html += '</ul></nav>';

    // Attach pagination click handlers after insertion
    setTimeout(() => {
      document.querySelectorAll('.pagination .page-link[data-page]').forEach((link) => {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          const newPage = parseInt(link.getAttribute('data-page'));
          if (!isNaN(newPage)) {
            const newParams = new URLSearchParams(params.toString());
            newParams.set('page', newPage);
            performSearch(newParams);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        });
      });
    }, 0);

    return html;
  }

  function buildNoResultsHTML(query) {
    return `
      <div class="no-results text-center py-5">
        <div class="mb-3">
          <i class="bi bi-image-alt" style="font-size:4rem;color:var(--bs-secondary);"></i>
        </div>
        <h3 class="text-muted">No images found</h3>
        ${query ? `<p class="text-muted">No results for <em>"${escapeHtml(query)}"</em>. Try different keywords or adjust filters.</p>` : '<p class="text-muted">No images match your filters.</p>'}
        <a href="/search" class="btn btn-outline-primary mt-2">
          <i class="bi bi-arrow-counterclockwise me-1"></i>Clear All Filters
        </a>
      </div>
    `;
  }

  // ─── UI Helpers ──────────────────────────────────────────────────────────────

  function setLoadingState(loading) {
    if (resultsGrid) {
      if (loading) {
        resultsGrid.classList.add('loading');
      } else {
        resultsGrid.classList.remove('loading');
      }
    }
  }

  function updateResultsCount(data) {
    const countEl = document.querySelector('.results-count');
    if (countEl && data.pagination) {
      const count = data.pagination.count;
      countEl.innerHTML = `<span class="fw-semibold">${count.toLocaleString()}</span> ${count === 1 ? 'result' : 'results'}`;
    }
  }

  function showSearchError() {
    if (resultsGrid) {
      resultsGrid.innerHTML = `
        <div class="alert alert-danger" role="alert">
          <i class="bi bi-exclamation-triangle me-2"></i>
          An error occurred while searching. Please try again.
        </div>
      `;
    }
  }

  // ─── Utility ─────────────────────────────────────────────────────────────────

  /**
   * Collect all current active params from the page state.
   */
  function collectCurrentParams() {
    const params = new URLSearchParams(window.location.search);
    return params;
  }

  /**
   * Highlight search query text within a string (returns HTML).
   */
  function highlightText(text, query) {
    if (!query || !text) return escapeHtml(text || '');
    const escaped = escapeHtml(text);
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    try {
      const regex = new RegExp(`(${escapedQuery})`, 'gi');
      return escaped.replace(regex, '<mark class="search-highlight">$1</mark>');
    } catch (e) {
      return escaped;
    }
  }

  /**
   * Escape a string for safe HTML insertion.
   */
  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // ─── Sort Change ─────────────────────────────────────────────────────────────

  /**
   * Called from the inline onchange handler in the sort select.
   */
  window.applySortChange = function (value) {
    const params = new URLSearchParams(window.location.search);
    if (value && value !== 'relevance') {
      params.set('sortBy', value);
    } else {
      params.delete('sortBy');
    }
    params.delete('page');
    performSearch(params);
  };

  // ─── Boot ────────────────────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();