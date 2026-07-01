/**
 * Search page client-side JS
 * - Debounced search-as-you-type (300ms)
 * - Updates results grid without full page reload
 * - Syncs browser URL with history.pushState
 */

(function () {
  'use strict';

  const DEBOUNCE_MS = 300;

  let debounceTimer = null;
  let currentController = null;

  // Elements
  const searchInput = document.getElementById('search-input');
  const resultsContainer = document.getElementById('results-container');
  const loadingIndicator = document.getElementById('search-loading');
  const sortSelect = document.getElementById('sort-select');
  const filterForm = document.getElementById('filter-form');

  // Only run on search page
  if (!searchInput || !resultsContainer) return;

  /**
   * Collect current filter values from the filter form
   */
  function collectFilters() {
    const params = new URLSearchParams();
    const q = searchInput.value.trim();
    if (q) params.set('q', q);

    if (filterForm) {
      // Date range
      const dateFrom = filterForm.querySelector('[name="dateFrom"]');
      const dateTo = filterForm.querySelector('[name="dateTo"]');
      if (dateFrom && dateFrom.value) params.set('dateFrom', dateFrom.value);
      if (dateTo && dateTo.value) params.set('dateTo', dateTo.value);

      // Camera make
      const cameraMake = filterForm.querySelector('[name="cameraMake"]');
      if (cameraMake && cameraMake.value && cameraMake.value !== 'any') {
        params.set('cameraMake', cameraMake.value);
      }

      // Has GPS
      const hasGps = filterForm.querySelector('[name="hasGps"]');
      if (hasGps && hasGps.checked) params.set('hasGps', 'true');

      // Tags
      const tagCheckboxes = filterForm.querySelectorAll('[name="tags"]:checked');
      tagCheckboxes.forEach((cb) => params.append('tags', cb.value));
    }

    // Sort
    if (sortSelect && sortSelect.value !== 'relevance') {
      params.set('sort', sortSelect.value);
    }

    return params;
  }

  /**
   * Render results HTML from API response
   */
  function renderResults(data) {
    if (!data || !data.results) return;

    const { results, pagination } = data;

    if (results.length === 0) {
      resultsContainer.innerHTML = `
        <div class="text-center py-5">
          <div class="mb-4">
            <i class="bi bi-search" style="font-size: 4rem; color: #dee2e6;"></i>
          </div>
          <h3 class="h5 text-muted mb-3">No images found</h3>
          <p class="text-muted mb-4">Try adjusting your search terms or filters.</p>
          <a href="/search" class="btn btn-outline-primary me-2">
            <i class="bi bi-x-circle me-1"></i>Clear All Filters
          </a>
          <a href="/gallery" class="btn btn-primary">
            <i class="bi bi-images me-1"></i>Browse All Images
          </a>
        </div>
      `;
      return;
    }

    // Build result count line
    const from = (pagination.currentPage - 1) * pagination.limit + 1;
    const to = Math.min(pagination.currentPage * pagination.limit, pagination.totalCount);

    let html = `
      <div class="d-flex justify-content-between align-items-center mb-3">
        <span class="text-muted small">
          Showing ${from}–${to} of ${pagination.totalCount}
        </span>
        <div class="d-flex align-items-center gap-2">
          <label class="text-muted small mb-0">Sort:</label>
          <select class="form-select form-select-sm w-auto" id="sort-select">
            <option value="relevance" ${sortSelect && sortSelect.value === 'relevance' ? 'selected' : ''}>Relevance</option>
            <option value="newest" ${sortSelect && sortSelect.value === 'newest' ? 'selected' : ''}>Newest</option>
            <option value="oldest" ${sortSelect && sortSelect.value === 'oldest' ? 'selected' : ''}>Oldest</option>
          </select>
        </div>
      </div>
      <div class="row g-3" id="results-grid">
    `;

    results.forEach((image) => {
      const thumbnailUrl = image.thumbnailPath
        ? `/uploads/${image.thumbnailPath}`
        : image.filePath
        ? `/uploads/${image.filePath}`
        : '/img/placeholder.png';

      const tags = image.tags || [];
      const tagBadges = tags
        .slice(0, 3)
        .map(
          (t) =>
            `<a href="/search?tags=${encodeURIComponent(t.name)}" class="badge bg-secondary text-decoration-none me-1">${escapeHtml(t.name)}</a>`
        )
        .join('');

      html += `
        <div class="col-6 col-md-4 col-xl-3">
          <div class="card h-100 border-0 shadow-sm image-card">
            <a href="/gallery/${image.id}" class="card-img-link">
              <img
                src="${escapeHtml(thumbnailUrl)}"
                class="card-img-top object-fit-cover"
                style="height: 180px;"
                alt="${escapeHtml(image.originalName || '')}"
                loading="lazy"
              >
            </a>
            <div class="card-body p-2">
              <p class="card-text small text-muted text-truncate mb-1" title="${escapeHtml(image.originalName || '')}">
                ${escapeHtml(image.originalName || 'Untitled')}
              </p>
              ${tagBadges ? `<div class="mt-1">${tagBadges}</div>` : ''}
            </div>
          </div>
        </div>
      `;
    });

    html += '</div>';

    // Pagination
    if (pagination.totalPages > 1) {
      html += buildPagination(pagination);
    }

    resultsContainer.innerHTML = html;

    // Re-attach sort select listener
    const newSortSelect = document.getElementById('sort-select');
    if (newSortSelect) {
      newSortSelect.addEventListener('change', handleSortChange);
    }
  }

  /**
   * Build simple pagination HTML
   */
  function buildPagination(pagination) {
    const { currentPage, totalPages } = pagination;
    let html = '<nav class="mt-4" aria-label="Search results pages"><ul class="pagination justify-content-center">';

    // Previous
    html += `<li class="page-item ${currentPage <= 1 ? 'disabled' : ''}">
      <button class="page-link" data-page="${currentPage - 1}" ${currentPage <= 1 ? 'disabled' : ''}>
        <i class="bi bi-chevron-left"></i>
      </button>
    </li>`;

    // Page numbers (show up to 5)
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, startPage + 4);

    for (let i = startPage; i <= endPage; i++) {
      html += `<li class="page-item ${i === currentPage ? 'active' : ''}">
        <button class="page-link" data-page="${i}">${i}</button>
      </li>`;
    }

    // Next
    html += `<li class="page-item ${currentPage >= totalPages ? 'disabled' : ''}">
      <button class="page-link" data-page="${currentPage + 1}" ${currentPage >= totalPages ? 'disabled' : ''}>
        <i class="bi bi-chevron-right"></i>
      </button>
    </li>`;

    html += '</ul></nav>';

    return html;
  }

  /**
   * Escape HTML to prevent XSS in dynamically generated content
   */
  function escapeHtml(str) {
    if (typeof str !== 'string') return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Show loading state
   */
  function showLoading() {
    if (loadingIndicator) loadingIndicator.classList.remove('d-none');
    if (resultsContainer) resultsContainer.style.opacity = '0.4';
  }

  /**
   * Hide loading state
   */
  function hideLoading() {
    if (loadingIndicator) loadingIndicator.classList.add('d-none');
    if (resultsContainer) resultsContainer.style.opacity = '1';
  }

  /**
   * Perform search via API and update page
   */
  async function performSearch(params, pushState = true) {
    // Cancel previous request
    if (currentController) {
      currentController.abort();
    }
    currentController = new AbortController();

    showLoading();

    try {
      const url = `/api/search?${params.toString()}`;
      const response = await fetch(url, {
        signal: currentController.signal,
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) throw new Error(`HTTP error: ${response.status}`);

      const data = await response.json();
      renderResults(data);

      // Update browser URL without page reload
      if (pushState) {
        const newUrl = params.toString()
          ? `/search?${params.toString()}`
          : '/search';
        history.pushState({ params: params.toString() }, '', newUrl);
      }

      // Update page title with result count
      const count = data.pagination ? data.pagination.totalCount : 0;
      const q = params.get('q');
      document.title = q
        ? `Search: "${q}" (${count} results)`
        : `Search (${count} results)`;

    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Search error:', err);
        resultsContainer.innerHTML = `
          <div class="alert alert-danger" role="alert">
            <i class="bi bi-exclamation-triangle me-2"></i>
            Search failed. Please try again.
          </div>
        `;
      }
    } finally {
      hideLoading();
    }
  }

  /**
   * Debounced input handler
   */
  function handleSearchInput() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const params = collectFilters();
      performSearch(params);
    }, DEBOUNCE_MS);
  }

  /**
   * Sort change handler
   */
  function handleSortChange() {
    const params = collectFilters();
    performSearch(params);
  }

  /**
   * Pagination click handler (delegated)
   */
  function handlePaginationClick(e) {
    const btn = e.target.closest('[data-page]');
    if (!btn) return;
    e.preventDefault();
    const page = parseInt(btn.dataset.page, 10);
    if (isNaN(page)) return;

    const params = collectFilters();
    if (page > 1) params.set('page', String(page));
    performSearch(params);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /**
   * Handle browser back/forward navigation
   */
  function handlePopState(e) {
    if (e.state && e.state.params !== undefined) {
      const params = new URLSearchParams(e.state.params);
      performSearch(params, false);
    }
  }

  // Event listeners
  if (searchInput) {
    searchInput.addEventListener('input', handleSearchInput);
  }

  if (sortSelect) {
    sortSelect.addEventListener('change', handleSortChange);
  }

  // Delegated pagination click handler
  document.addEventListener('click', handlePaginationClick);

  // Browser back/forward
  window.addEventListener('popstate', handlePopState);

  // Filter form — use AJAX instead of full page reload
  if (filterForm) {
    filterForm.addEventListener('submit', function (e) {
      e.preventDefault();
      const params = collectFilters();
      performSearch(params);
    });
  }

  // Save initial state for popstate
  const initialParams = new URLSearchParams(window.location.search);
  history.replaceState({ params: initialParams.toString() }, '', window.location.href);

})();