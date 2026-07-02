/**
 * Bulk Selection Mode for Gallery
 * Allows selecting multiple images for bulk operations (tag, untag, delete)
 */

(function () {
  'use strict';

  const selectedIds = new Set();
  let isSelectionMode = false;

  const toggleBtn = document.getElementById('bulk-select-toggle-btn');
  const actionBar = document.getElementById('bulk-action-bar');
  const countDisplay = document.getElementById('bulk-selected-count');
  const selectAllBtn = document.getElementById('bulk-select-all-btn');
  const clearSelBtn = document.getElementById('bulk-clear-selection-btn');
  const addTagBtn = document.getElementById('bulk-add-tag-btn');
  const removeTagBtn = document.getElementById('bulk-remove-tag-btn');
  const deleteBtn = document.getElementById('bulk-delete-btn');
  const tagInputContainer = document.getElementById('bulk-tag-input-container');
  const tagInput = document.getElementById('bulk-tag-input');
  const tagConfirmBtn = document.getElementById('bulk-tag-confirm-btn');
  const tagCancelBtn = document.getElementById('bulk-tag-cancel-btn');

  let pendingAction = null; // 'addTag' | 'removeTag'

  if (!toggleBtn) return; // Not on gallery page

  // ─── Selection Mode Toggle ────────────────────────────────────────────────

  function enableSelectionMode() {
    isSelectionMode = true;
    document.body.classList.add('bulk-select-mode');
    toggleBtn.textContent = 'Exit Selection';
    toggleBtn.classList.add('is-active');
    addCheckboxesToCards();
    updateActionBar();
  }

  function disableSelectionMode() {
    isSelectionMode = false;
    document.body.classList.remove('bulk-select-mode');
    toggleBtn.textContent = 'Select Images';
    toggleBtn.classList.remove('is-active');
    selectedIds.clear();
    removeCheckboxesFromCards();
    updateActionBar();
    hideTagInput();
  }

  toggleBtn.addEventListener('click', () => {
    if (isSelectionMode) {
      disableSelectionMode();
    } else {
      enableSelectionMode();
    }
  });

  // ─── Checkbox Management ──────────────────────────────────────────────────

  function addCheckboxesToCards() {
    document.querySelectorAll('.image-card[data-image-id]').forEach(card => {
      if (card.querySelector('.bulk-checkbox')) return; // Already has checkbox

      const id = card.dataset.imageId;
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'bulk-checkbox';
      checkbox.dataset.imageId = id;
      checkbox.checked = selectedIds.has(id);
      checkbox.setAttribute('aria-label', `Select image ${id}`);

      checkbox.addEventListener('change', (e) => {
        e.stopPropagation();
        if (checkbox.checked) {
          selectedIds.add(id);
          card.classList.add('is-selected');
        } else {
          selectedIds.delete(id);
          card.classList.remove('is-selected');
        }
        updateActionBar();
      });

      // Click on card selects/deselects (but not on card's anchor links)
      card.addEventListener('click', handleCardClick);

      card.appendChild(checkbox);

      // Update selection state
      if (selectedIds.has(id)) {
        card.classList.add('is-selected');
      }
    });
  }

  function removeCheckboxesFromCards() {
    document.querySelectorAll('.bulk-checkbox').forEach(cb => cb.remove());
    document.querySelectorAll('.image-card').forEach(card => {
      card.classList.remove('is-selected');
      card.removeEventListener('click', handleCardClick);
    });
  }

  function handleCardClick(e) {
    // Don't intercept clicks on actual links or buttons inside the card
    if (e.target.tagName === 'A' || e.target.closest('a') || e.target.tagName === 'BUTTON') {
      return;
    }
    if (!isSelectionMode) return;
    e.preventDefault();

    const card = e.currentTarget;
    const id = card.dataset.imageId;
    const checkbox = card.querySelector('.bulk-checkbox');

    if (!checkbox) return;
    checkbox.checked = !checkbox.checked;
    checkbox.dispatchEvent(new Event('change'));
  }

  // ─── Action Bar ───────────────────────────────────────────────────────────

  function updateActionBar() {
    if (!actionBar) return;

    const count = selectedIds.size;

    if (isSelectionMode && count > 0) {
      actionBar.classList.add('is-visible');
    } else {
      actionBar.classList.remove('is-visible');
    }

    if (countDisplay) {
      countDisplay.textContent = count === 1 ? '1 image selected' : `${count} images selected`;
    }
  }

  // ─── Select All / Clear ───────────────────────────────────────────────────

  if (selectAllBtn) {
    selectAllBtn.addEventListener('click', () => {
      document.querySelectorAll('.image-card[data-image-id]').forEach(card => {
        const id = card.dataset.imageId;
        const checkbox = card.querySelector('.bulk-checkbox');
        selectedIds.add(id);
        card.classList.add('is-selected');
        if (checkbox) checkbox.checked = true;
      });
      updateActionBar();
    });
  }

  if (clearSelBtn) {
    clearSelBtn.addEventListener('click', () => {
      selectedIds.clear();
      document.querySelectorAll('.image-card').forEach(card => {
        card.classList.remove('is-selected');
        const checkbox = card.querySelector('.bulk-checkbox');
        if (checkbox) checkbox.checked = false;
      });
      updateActionBar();
    });
  }

  // ─── Tag Input ────────────────────────────────────────────────────────────

  function showTagInput(action) {
    pendingAction = action;
    if (!tagInputContainer) return;
    tagInputContainer.style.display = 'flex';
    tagInput.value = '';
    tagInput.placeholder = action === 'addTag' ? 'Enter tag name to add...' : 'Enter tag name to remove...';
    tagInput.focus();
  }

  function hideTagInput() {
    pendingAction = null;
    if (!tagInputContainer) return;
    tagInputContainer.style.display = 'none';
    if (tagInput) tagInput.value = '';
  }

  if (addTagBtn) {
    addTagBtn.addEventListener('click', () => showTagInput('addTag'));
  }

  if (removeTagBtn) {
    removeTagBtn.addEventListener('click', () => showTagInput('removeTag'));
  }

  if (tagCancelBtn) {
    tagCancelBtn.addEventListener('click', hideTagInput);
  }

  if (tagConfirmBtn) {
    tagConfirmBtn.addEventListener('click', () => executeBulkTagAction());
  }

  if (tagInput) {
    tagInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') executeBulkTagAction();
      if (e.key === 'Escape') hideTagInput();
    });
  }

  async function executeBulkTagAction() {
    const tagName = tagInput?.value?.trim();
    if (!tagName) {
      showBulkStatus('Please enter a tag name.', 'error');
      return;
    }

    if (selectedIds.size === 0) {
      showBulkStatus('No images selected.', 'error');
      return;
    }

    const action = pendingAction;
    const imageIds = Array.from(selectedIds).map(id => parseInt(id, 10));
    hideTagInput();
    await executeBulkRequest(imageIds, action, { tagName });
  }

  // ─── Delete ───────────────────────────────────────────────────────────────

  if (deleteBtn) {
    deleteBtn.addEventListener('click', async () => {
      if (selectedIds.size === 0) return;

      const count = selectedIds.size;
      const confirmed = window.confirm(
        `Are you sure you want to permanently delete ${count} image${count !== 1 ? 's' : ''}? This cannot be undone.`
      );
      if (!confirmed) return;

      const imageIds = Array.from(selectedIds).map(id => parseInt(id, 10));
      await executeBulkRequest(imageIds, 'delete', {});
    });
  }

  // ─── API Request ──────────────────────────────────────────────────────────

  async function executeBulkRequest(imageIds, action, payload) {
    const bulkStatusEl = document.getElementById('bulk-status');

    // Disable buttons during operation
    setActionBarLoading(true);

    try {
      const response = await fetch('/api/images/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageIds, action, payload })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Bulk operation failed');
      }

      const result = data.result || {};
      const succeeded = result.succeeded || [];
      const failed = result.failed || [];

      if (action === 'delete') {
        // Remove deleted cards from DOM
        succeeded.forEach(id => {
          const card = document.querySelector(`.image-card[data-image-id="${id}"]`);
          if (card) {
            card.style.transition = 'opacity 0.3s, transform 0.3s';
            card.style.opacity = '0';
            card.style.transform = 'scale(0.9)';
            setTimeout(() => card.remove(), 300);
          }
          selectedIds.delete(String(id));
        });
      } else {
        // For tag operations, just update selection state
        succeeded.forEach(id => {
          // Visual feedback - flash green on card
          const card = document.querySelector(`.image-card[data-image-id="${id}"]`);
          if (card) {
            card.classList.add('bulk-op-success');
            setTimeout(() => card.classList.remove('bulk-op-success'), 1500);
          }
        });
      }

      let message = '';
      if (succeeded.length > 0) {
        const actionLabel = action === 'delete' ? 'deleted' : action === 'addTag' ? 'tagged' : 'untagged';
        message = `${succeeded.length} image${succeeded.length !== 1 ? 's' : ''} ${actionLabel} successfully.`;
      }
      if (failed.length > 0) {
        message += ` ${failed.length} failed.`;
      }

      showBulkStatus(message, failed.length > 0 ? 'warning' : 'success');
      updateActionBar();

    } catch (err) {
      console.error('Bulk operation error:', err);
      showBulkStatus(`Error: ${err.message}`, 'error');
    } finally {
      setActionBarLoading(false);
    }
  }

  function setActionBarLoading(loading) {
    [addTagBtn, removeTagBtn, deleteBtn, selectAllBtn, clearSelBtn].forEach(btn => {
      if (btn) btn.disabled = loading;
    });
  }

  // ─── Status Messages ──────────────────────────────────────────────────────

  function showBulkStatus(message, type = 'info') {
    let statusEl = document.getElementById('bulk-status');
    if (!statusEl) {
      statusEl = document.createElement('div');
      statusEl.id = 'bulk-status';
      statusEl.className = 'bulk-status';
      if (actionBar) actionBar.appendChild(statusEl);
    }

    statusEl.textContent = message;
    statusEl.className = `bulk-status bulk-status--${type} is-visible`;

    if (type === 'success' || type === 'warning') {
      setTimeout(() => {
        statusEl.classList.remove('is-visible');
      }, 4000);
    }
  }

})();