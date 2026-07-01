/**
 * search.js — Client-side search with debounce, fetch, and history.pushState
 */

(function () {
  'use strict';

  const DEBOUNCE_DELAY = 300;
  const API_ENDPOINT = '/api/search';

  // State
  let debounceTimer = null;
  let currentController = null;
  let isLiveSearchEnabled = false;

  // DOM Elements (initialized on DOMContentLoaded)
  let searchInput = null;
  let resultsGrid = null;
  let resultCount = null;
  let noResults = null;

  /**
   * Initialize the search module
   */
  function init() {
    searchInput = document.getElementById('searchInput');
    resultsGrid = document.getElementById('resultsGrid');

    if (!searchInput) return;

    // Only enable live search if we have an API endpoint to call
    isLiveSearchEnabled = true;

    // Listen for input changes with debounce
    searchInput.addEventListener('input', handleSearchInput);

    // Handle browser back/forward navigation
    window.addEventListener('popstate', handlePopState);

    // Sync sort select changes to URL
    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) {
      // Already handled inline via applySortChange
    }
  }

  /**
   * Handle input changes with debounce
   */
  function handleSearchInput(e) {
    const query = e.target.value;

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      performLiveSearch(query);
    }, DEBOUNCE_DELAY);
  }

  /**
   * Perform a live search via the API and update results grid
   */
  async function performLiveSearch(q) {
    if (!isLiveSearchEnabled) return;

    // Build params from current URL + new query
    const params = getCurrentParams();
    params.set('q', q);
    params.delete('page'); // Reset to page 1 on new search

    // Update browser URL without reload
    const newUrl = buildUrl(params);
    history.pushState({ params: params.toString() }, '', newUrl);

    // Fetch results
    await fetchAndUpdateResults(params);
  }

  /**
   * Fetch results from API and update the DOM
   */
  async function fetchAndUpdateResults(params) {
    // Cancel any in-flight request
    if (currentController) {
      currentController.abort();
    }
    currentController = new AbortController();

    // Show loading state
    showLoadingState();

    try {
      const url = `${API_ENDPOINT}?${params.toString()}`;
      const response = await fetch(url, {
        signal: currentController.signal,
        headers: { 'Accept': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`Search API error: ${response.status}`);
      }

      const data = await response.json();
      renderResults(data);
      updateResultCount(data.pagination);
    } catch (err) {
      if (err.name === 'AbortError') {
        // Request was cancelled, ignore
        return;
      }
      console.error('Search error:', err);
      showErrorState();
    } finally {
      hideLoadingState();
    }
  }

  /**
   * Render search results into the grid
   */
  function renderResults(data) {
    const grid = document.getElementById('resultsGrid');
    const noResultsEl = document.querySelector('.no-results');

    if (!data.results || data.results.length === 0) {
      // Show no-results state
      if (grid) grid.innerHTML = '';
      if (!noResultsEl) {
        const container = grid ? grid.parentElement : document.querySelector('.col-lg-9');
        if (container) {
          const existing = container.querySelector('.no-results');
          if (!existing) {
            container.insertAdjacentHTML('beforeend', buildNoResultsHtml());
          }
        }
      }
      return;
    }

    // Remove no-results if it exists
    if (noResultsEl) noResultsEl.remove();

    // Create grid if it doesn't exist
    let gridEl = document.getElementById('resultsGrid');
    if (!gridEl) {
      const container = document.querySelector('.col-lg-9');
      if (container) {
        const newGrid = document.createElement('div');
        newGrid.className = 'row g-3';
        newGrid.id = 'resultsGrid';
        // Insert before pagination or at end
        const pagination = container.querySelector('nav');
        if (pagination) {
          container.insertBefore(newGrid, pagination);
        } else {
          container.appendChild(newGrid);
        }
        gridEl = newGrid;
      }
    }

    if (!gridEl) return;

    // Render image cards
    gridEl.innerHTML = data.results.map(image => buildImageCardHtml(image)).join('');

    // Update pagination
    updatePagination(data.pagination, getCurrentParams());
  }

  /**
   * Build image card HTML (simplified version matching the server partial)
   */
  function buildImageCardHtml(image) {
    const tags = image.tags || [];
    const tagBadges = tags.slice(0, 3).map(tag =>
      `<a href="/search?tags=${encodeURIComponent(tag.name)}" class="badge bg-secondary text-decoration-none me-1">${escapeHtml(tag.name)}</a>`
    ).join('');

    const thumbnailUrl = image.thumbnailPath
      ? `/uploads/${image.thumbnailPath.split('/').pop()}`
      : (image.filePath ? `/uploads/${image.filePath.split('/').pop()}` : '/img/placeholder.jpg');

    return `
      <div class="col-sm-6 col-md-4 col-xl-3">
        <div class="card image-card h-100 shadow-sm">
          <a href="/gallery/${image.id}" class="card-img-link">
            <img
              src="${thumbnailUrl}"
              class="card-img-top"
              alt="${escapeHtml(image.originalName || 'Image')}"
              loading="lazy"
              style="height: 180px; object-fit: cover;"
              onerror="this.src='/img/placeholder.jpg'"
            >
          </a>
          <div class="card-body p-2">
            <h6 class="card-title text-truncate small mb-1" title="${escapeHtml(image.originalName || '')}">
              ${escapeHtml(image.originalName || 'Untitled')}
            </h6>
            ${image.description ? `<p class="card-text text-muted small text-truncate mb-1">${escapeHtml(image.description)}</p>` : ''}
            ${tagBadges ? `<div class="mt-1">${tagBadges}</div>` : ''}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Build no-results HTML
   */
  function buildNoResultsHtml() {
    return `
      <div class="no-results text-center py-5">
        <div class="mb-4">
          <i class="bi bi-search display-1 text-muted opacity-50"></i>
        </div>
        <h2 class="h4 text-muted">No images found</h2>
        <p class="text-muted">Try adjusting your search terms or filters.</p>
        <div class="mt-4">
          <a href="/search" class="btn btn-outline-primary me-2">
            <i class="bi bi-x-circle me-1"></i>Clear All Filters
          </a>
          <a href="/gallery" class="btn btn-primary">
            <i class="bi bi-images me-1"></i>Browse All Images
          </a>
        </div>
      </div>
    `;
  }

  /**
   * Update the result count display
   */
  function updateResultCount(pagination) {
    const countEl = document.querySelector('.search-header p.text-muted');
    if (!countEl || !pagination) return;

    const total = pagination.total || 0;
    const q = new URLSearchParams(window.location.search).get('q') || '';
    countEl.innerHTML = `Found <strong>${total}</strong> result${total !== 1 ? 's' : ''}${q ? ` for "<strong>${escapeHtml(q)}</strong>"` : ''}`;
  }

  /**
   * Update pagination links
   */
  function updatePagination(pagination, params) {
    const navEl = document.querySelector('nav[aria-label="Search results pagination"]');

    if (!pagination || pagination.totalPages <= 1) {
      if (navEl) navEl.remove();
      return;
    }

    // Rebuild pagination — simple approach
    const paginationHtml = buildPaginationHtml(pagination, params);
    if (navEl) {
      navEl.innerHTML = paginationHtml;
    } else {
      const container = document.querySelector('.col-lg-9');
      if (container) {
        container.insertAdjacentHTML('beforeend', `<nav class="mt-4" aria-label="Search results pagination">${paginationHtml}</nav>`);
      }
    }
  }

  /**
   * Build pagination HTML
   */
  function buildPaginationHtml(pagination, params) {
    const { currentPage, totalPages } = pagination;
    let html = '<ul class="pagination justify-content-center">';

    // Previous
    if (currentPage > 1) {
      const prevParams = new URLSearchParams(params.toString());
      prevParams.set('page', currentPage - 1);
      html += `<li class="page-item"><a class="page-link" href="/search?${prevParams.toString()}" onclick="navigatePage(event, this.href)">&laquo; Prev</a></li>`;
    } else {
      html += '<li class="page-item disabled"><span class="page-link">&laquo; Prev</span></li>';
    }

    // Page numbers (show window of 5)
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);

    if (startPage > 1) {
      const p1 = new URLSearchParams(params.toString());
      p1.set('page', 1);
      html += `<li class="page-item"><a class="page-link" href="/search?${p1.toString()}" onclick="navigatePage(event, this.href)">1</a></li>`;
      if (startPage > 2) html += '<li class="page-item disabled"><span class="page-link">…</span></li>';
    }

    for (let p = startPage; p <= endPage; p++) {
      const pageParams = new URLSearchParams(params.toString());
      pageParams.set('page', p);
      if (p === currentPage) {
        html += `<li class="page-item active"><span class="page-link">${p}</span></li>`;
      } else {
        html += `<li class="page-item"><a class="page-link" href="/search?${pageParams.toString()}" onclick="navigatePage(event, this.href)">${p}</a></li>`;
      }
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) html += '<li class="page-item disabled"><span class="page-link">…</span></li>';
      const lastParams = new URLSearchParams(params.toString());
      lastParams.set('page', totalPages);
      html += `<li class="page-item"><a class="page-link" href="/search?${lastParams.toString()}" onclick="navigatePage(event, this.href)">${totalPages}</a></li>`;
    }

    // Next
    if (currentPage < totalPages) {
      const nextParams = new URLSearchParams(params.toString());
      nextParams.set('page', currentPage + 1);
      html += `<li class="page-item"><a class="page-link" href="/search?${nextParams.toString()}" onclick="navigatePage(event, this.href)">Next &raquo;</a></li>`;
    } else {
      html += '<li class="page-item disabled"><span class="page-link">Next &raquo;</span></li>';
    }

    html += '</ul>';
    return html;
  }

  /**
   * Handle browser back/forward navigation
   */
  function handlePopState(e) {
    const params = new URLSearchParams(window.location.search);

    // Update search input
    if (searchInput) {
      searchInput.value = params.get('q') || '';
    }

    // Fetch new results
    fetchAndUpdateResults(params);
  }

  /**
   * Get current URL params
   */
  function getCurrentParams() {
    return new URLSearchParams(window.location.search);
  }

  /**
   * Build full URL with params
   */
  function buildUrl(params) {
    const qs = params.toString();
    return `/search${qs ? '?' + qs : ''}`;
  }

  /**
   * Show loading state in results grid
   */
  function showLoadingState() {
    const grid = document.getElementById('resultsGrid');
    if (grid) {
      grid.style.opacity = '0.5';
      grid.style.pointerEvents = 'none';
    }

    // Add spinner if not present
    let spinner = document.getElementById('searchSpinner');
    if (!spinner) {
      const container = document.querySelector('.col-lg-9');
      if (container) {
        spinner = document.createElement('div');
        spinner.id = 'searchSpinner';
        spinner.className = 'text-center py-2 mb-2';
        spinner.innerHTML = '<div class="spinner-border spinner-border-sm text-primary" role="status"><span class="visually-hidden">Searching...</span></div> <span class="small text-muted ms-1">Searching...</span>';
        const sortRow = container.querySelector('.d-flex.justify-content-between');
        if (sortRow) {
          sortRow.parentNode.insertBefore(spinner, sortRow.nextSibling);
        } else {
          container.prepend(spinner);
        }
      }
    }
  }

  /**
   * Hide loading state
   */
  function hideLoadingState() {
    const grid = document.getElementById('resultsGrid');
    if (grid) {
      grid.style.opacity = '';
      grid.style.pointerEvents = '';
    }

    const spinner = document.getElementById('searchSpinner');
    if (spinner) spinner.remove();
  }

  /**
   * Show error state
   */
  function showErrorState() {
    const grid = document.getElementById('resultsGrid');
    if (grid) {
      grid.style.opacity = '';
      grid.style.pointerEvents = '';
    }
    // Could show a toast or inline error message
    console.warn('Search failed. Please try again.');
  }

  /**
   * Escape HTML to prevent XSS
   */
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Global functions called from inline event handlers

  /**
   * Navigate to a page URL via fetch (prevents full reload)
   */
  window.navigatePage = function (e, href) {
    e.preventDefault();
    const url = new URL(href, window.location.origin);
    const params = url.searchParams;
    history.pushState({ params: params.toString() }, '', href);
    if (searchInput) {
      searchInput.value = params.get('q') || '';
    }
    fetchAndUpdateResults(params);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /**
   * Apply sort change
   */
  window.applySortChange = function (sortBy) {
    const params = getCurrentParams();
    if (sortBy === 'relevance') {
      params.delete('sortBy');
    } else {
      params.set('sortBy', sortBy);
    }
    params.delete('page');
    const newUrl = buildUrl(params);
    history.pushState({ params: params.toString() }, '', newUrl);
    fetchAndUpdateResults(params);
  };

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();