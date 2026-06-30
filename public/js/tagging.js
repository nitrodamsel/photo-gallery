/**
 * tagging.js - Client-side tagging logic
 * Handles tag input with autocomplete, add/remove tags via AJAX,
 * and inline rename for tag management page.
 */

(function () {
  'use strict';

  // ─── Autocomplete Setup ─────────────────────────────────────────────────────

  /**
   * Initialize autocomplete on a tag input using a datalist
   * @param {HTMLInputElement} input - The tag input element
   * @param {string} datalistId - ID of the datalist element to populate
   */
  function initTagAutocomplete(input, datalistId) {
    if (!input) return;

    let debounceTimer = null;

    input.addEventListener('input', function () {
      const query = this.value.trim();
      clearTimeout(debounceTimer);

      if (query.length < 1) return;

      debounceTimer = setTimeout(async () => {
        try {
          const res = await fetch('/api/tags?q=' + encodeURIComponent(query));
          if (!res.ok) return;
          const tags = await res.json();

          const datalist = document.getElementById(datalistId);
          if (!datalist) return;

          datalist.innerHTML = '';
          tags.forEach(tag => {
            const option = document.createElement('option');
            option.value = tag.name;
            datalist.appendChild(option);
          });
        } catch (err) {
          // Silently fail autocomplete
        }
      }, 200);
    });
  }

  // ─── Tag Rendering ──────────────────────────────────────────────────────────

  /**
   * Render a tag badge element
   * @param {Object} tag - Tag data object
   * @param {number|string} imageId - The image ID
   * @returns {HTMLElement}
   */
  function renderTagBadge(tag, imageId) {
    const span = document.createElement('span');
    span.className = 'badge tag-badge me-1 mb-1 d-inline-flex align-items-center';
    span.id = 'tag-badge-' + tag.id;
    span.style.backgroundColor = tag.color || '#6c757d';
    span.style.color = getContrastColor(tag.color || '#6c757d');
    span.innerHTML =
      escapeHtml(tag.name) +
      '<button type="button" class="btn-close btn-close-sm ms-2 tag-remove-btn" ' +
      'aria-label="Remove tag ' + escapeHtml(tag.name) + '" ' +
      'data-tag-id="' + tag.id + '" ' +
      'data-image-id="' + imageId + '" ' +
      'style="filter: ' + (isLight(tag.color || '#6c757d') ? 'none' : 'invert(1)') + '; width: 0.6em; height: 0.6em;">' +
      '</button>';
    return span;
  }

  /**
   * Re-render the tag list container with new tags data
   * @param {Array} tags - Array of tag objects
   * @param {number|string} imageId - The image ID
   * @param {HTMLElement} container - The container element
   */
  function renderTagList(tags, imageId, container) {
    if (!container) return;
    container.innerHTML = '';

    if (tags.length === 0) {
      const empty = document.createElement('span');
      empty.className = 'text-muted small';
      empty.id = 'no-tags-msg';
      empty.textContent = 'No tags yet. Add one above.';
      container.appendChild(empty);
      return;
    }

    tags.forEach(tag => {
      const badge = renderTagBadge(tag, imageId);
      container.appendChild(badge);
    });

    // Re-attach remove listeners
    attachRemoveListeners(container, imageId);
  }

  // ─── Tag Operations ─────────────────────────────────────────────────────────

  /**
   * Add a tag to an image via API
   * @param {number|string} imageId
   * @param {string} name
   * @param {HTMLElement} container - Tag badges container
   * @param {HTMLInputElement} input - The tag input (to clear on success)
   * @param {HTMLElement} feedbackEl - Optional feedback element
   */
  async function addTag(imageId, name, container, input, feedbackEl) {
    if (!name || name.trim().length < 2) {
      showFeedback(feedbackEl, 'Tag name must be at least 2 characters.', 'danger');
      return;
    }
    if (name.trim().length > 30) {
      showFeedback(feedbackEl, 'Tag name must be 30 characters or fewer.', 'danger');
      return;
    }
    if (!/^[a-zA-Z0-9\- ]+$/.test(name.trim())) {
      showFeedback(feedbackEl, 'Tag name may only contain letters, numbers, hyphens, and spaces.', 'danger');
      return;
    }

    showFeedback(feedbackEl, 'Adding...', 'muted');

    try {
      const res = await fetch('/api/images/' + imageId + '/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tagName: name.trim() })
      });
      const data = await res.json();

      if (!res.ok) {
        showFeedback(feedbackEl, data.error || 'Failed to add tag.', 'danger');
        return;
      }

      if (input) input.value = '';
      showFeedback(feedbackEl, '', '');
      renderTagList(data.tags, imageId, container);
    } catch (err) {
      showFeedback(feedbackEl, 'Network error. Please try again.', 'danger');
    }
  }

  /**
   * Remove a tag from an image via API
   * @param {number|string} imageId
   * @param {number|string} tagId
   * @param {HTMLElement} container - Tag badges container
   * @param {HTMLElement} feedbackEl - Optional feedback element
   */
  async function removeTag(imageId, tagId, container, feedbackEl) {
    // Optimistically hide the badge
    const badge = document.getElementById('tag-badge-' + tagId);
    if (badge) {
      badge.style.opacity = '0.4';
      badge.style.pointerEvents = 'none';
    }

    try {
      const res = await fetch('/api/images/' + imageId + '/tags/' + tagId, {
        method: 'DELETE'
      });
      const data = await res.json();

      if (!res.ok) {
        // Restore badge on error
        if (badge) {
          badge.style.opacity = '';
          badge.style.pointerEvents = '';
        }
        showFeedback(feedbackEl, data.error || 'Failed to remove tag.', 'danger');
        return;
      }

      renderTagList(data.tags, imageId, container);
    } catch (err) {
      if (badge) {
        badge.style.opacity = '';
        badge.style.pointerEvents = '';
      }
      showFeedback(feedbackEl, 'Network error. Please try again.', 'danger');
    }
  }

  // ─── Event Listeners ────────────────────────────────────────────────────────

  /**
   * Attach remove-tag event listeners to buttons in a container
   */
  function attachRemoveListeners(container, imageId) {
    const buttons = container.querySelectorAll('.tag-remove-btn');
    buttons.forEach(btn => {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        const tagId = this.dataset.tagId;
        const imgId = this.dataset.imageId || imageId;
        const feedbackEl = document.getElementById('tag-feedback');
        removeTag(imgId, tagId, container, feedbackEl);
      });
    });
  }

  // ─── Initialization ─────────────────────────────────────────────────────────

  function init() {
    // Image detail page — tag form
    const tagForm = document.getElementById('tagAddForm');
    const tagInput = document.getElementById('tagInput');
    const tagContainer = document.getElementById('tagBadgesContainer');
    const tagFeedback = document.getElementById('tag-feedback');

    if (tagForm && tagInput && tagContainer) {
      const imageId = tagForm.dataset.imageId;

      // Autocomplete
      initTagAutocomplete(tagInput, 'tagSuggestions');

      // Form submit
      tagForm.addEventListener('submit', function (e) {
        e.preventDefault();
        addTag(imageId, tagInput.value, tagContainer, tagInput, tagFeedback);
      });

      // Attach remove listeners to existing badges
      attachRemoveListeners(tagContainer, imageId);
    }
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // ─── Utilities ──────────────────────────────────────────────────────────────

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function showFeedback(el, message, type) {
    if (!el) return;
    if (!message) {
      el.innerHTML = '';
      return;
    }
    const colorMap = { danger: 'text-danger', success: 'text-success', muted: 'text-muted', warning: 'text-warning' };
    el.innerHTML = '<span class="' + (colorMap[type] || 'text-muted') + ' small">' + escapeHtml(message) + '</span>';
  }

  /**
   * Get a contrasting text color (black or white) for a given hex background
   */
  function getContrastColor(hexColor) {
    return isLight(hexColor) ? '#000000' : '#ffffff';
  }

  function isLight(hexColor) {
    try {
      const hex = hexColor.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      return luminance > 0.5;
    } catch {
      return false;
    }
  }

  // Expose for inline script usage (tag management page)
  window.TagManager = {
    addTag,
    removeTag,
    initTagAutocomplete,
    renderTagList,
    escapeHtml
  };

})();