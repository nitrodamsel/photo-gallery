/**
 * Bulk Select - Gallery selection mode for bulk operations
 * Enables checkboxes on image cards, tracks selections, shows floating action bar
 */
(function () {
  'use strict';

  let selectionMode = false;
  const selectedIds = new Set();

  function init() {
    const bulkToggleBtn = document.getElementById('bulkSelectToggle');
    if (!bulkToggleBtn) return;

    bulkToggleBtn.addEventListener('click', toggleSelectionMode);

    // Bulk action bar buttons
    const bulkAddTagBtn = document.getElementById('bulkAddTag');
    const bulkRemoveTagBtn = document.getElementById('bulkRemoveTag');
    const bulkDeleteBtn = document.getElementById('bulkDelete');
    const bulkSelectAllBtn = document.getElementById('bulkSelectAll');
    const bulkDeselectAllBtn = document.getElementById('bulkDeselectAll');

    if (bulkAddTagBtn) bulkAddTagBtn.addEventListener('click', handleBulkAddTag);
    if (bulkRemoveTagBtn) bulkRemoveTagBtn.addEventListener('click', handleBulkRemoveTag);
    if (bulkDeleteBtn) bulkDeleteBtn.addEventListener('click', handleBulkDelete);
    if (bulkSelectAllBtn) bulkSelectAllBtn.addEventListener('click', selectAll);
    if (bulkDeselectAllBtn) bulkDeselectAllBtn.addEventListener('click', deselectAll);
  }

  function toggleSelectionMode() {
    selectionMode = !selectionMode;
    const bulkToggleBtn = document.getElementById('bulkSelectToggle');

    if (selectionMode) {
      enterSelectionMode();
      if (bulkToggleBtn) {
        bulkToggleBtn.textContent = '✕ Exit Selection';
        bulkToggleBtn.classList.add('btn--active');
      }
    } else {
      exitSelectionMode();
      if (bulkToggleBtn) {
        bulkToggleBtn.textContent = '☑ Select';
        bulkToggleBtn.classList.remove('btn--active');
      }
    }
  }

  function enterSelectionMode() {
    const gallery = document.querySelector('.gallery-grid');
    if (!gallery) return;

    gallery.classList.add('selection-mode');

    // Add checkboxes to all image cards
    const cards = gallery.querySelectorAll('.image-card');
    cards.forEach(card => {
      const imageId = card.dataset.imageId;
      if (!imageId) return;

      // Create checkbox overlay
      const checkboxWrapper = document.createElement('div');
      checkboxWrapper.className = 'card-checkbox-wrapper';
      checkboxWrapper.innerHTML = `<input type="checkbox" class="card-checkbox" data-image-id="${imageId}" aria-label="Select image ${imageId}">`;
      card.appendChild(checkboxWrapper);

      // Handle checkbox change
      const checkbox = checkboxWrapper.querySelector('.card-checkbox');
      checkbox.addEventListener('change', (e) => {
        if (e.target.checked) {
          selectedIds.add(imageId);
          card.classList.add('card--selected');
        } else {
          selectedIds.delete(imageId);
          card.classList.remove('card--selected');
        }
        updateActionBar();
      });

      // Also allow clicking the card itself (excluding the link area)
      card.addEventListener('click', handleCardClick);
    });

    updateActionBar();
  }

  function exitSelectionMode() {
    const gallery = document.querySelector('.gallery-grid');
    if (!gallery) return;

    gallery.classList.remove('selection-mode');

    // Remove all checkboxes
    const checkboxWrappers = gallery.querySelectorAll('.card-checkbox-wrapper');
    checkboxWrappers.forEach(el => el.remove());

    // Remove selected state from cards
    const selectedCards = gallery.querySelectorAll('.card--selected');
    selectedCards.forEach(card => {
      card.classList.remove('card--selected');
      card.removeEventListener('click', handleCardClick);
    });

    // Clear selection
    selectedIds.clear();

    // Hide action bar
    const actionBar = document.getElementById('bulkActionBar');
    if (actionBar) {
      actionBar.classList.remove('bulk-action-bar--visible');
    }
  }

  function handleCardClick(e) {
    if (!selectionMode) return;

    // Don't interfere with the actual link
    const link = e.target.closest('a');
    if (link && !e.target.closest('.card-checkbox-wrapper')) {
      e.preventDefault();
    }

    // Toggle checkbox if clicking on card (not directly on checkbox)
    if (!e.target.classList.contains('card-checkbox')) {
      const card = e.currentTarget;
      const checkbox = card.querySelector('.card-checkbox');
      if (checkbox) {
        checkbox.checked = !checkbox.checked;
        checkbox.dispatchEvent(new Event('change'));
      }
    }
  }

  function selectAll() {
    const checkboxes = document.querySelectorAll('.card-checkbox');
    checkboxes.forEach(checkbox => {
      const imageId = checkbox.dataset.imageId;
      const card = checkbox.closest('.image-card');
      checkbox.checked = true;
      selectedIds.add(imageId);
      if (card) card.classList.add('card--selected');
    });
    updateActionBar();
  }

  function deselectAll() {
    const checkboxes = document.querySelectorAll('.card-checkbox');
    checkboxes.forEach(checkbox => {
      const card = checkbox.closest('.image-card');
      checkbox.checked = false;
      if (card) card.classList.remove('card--selected');
    });
    selectedIds.clear();
    updateActionBar();
  }

  function updateActionBar() {
    const actionBar = document.getElementById('bulkActionBar');
    const countDisplay = document.getElementById('bulkSelectedCount');

    if (!actionBar) return;

    const count = selectedIds.size;

    if (count > 0) {
      actionBar.classList.add('bulk-action-bar--visible');
    } else {
      actionBar.classList.remove('bulk-action-bar--visible');
    }

    if (countDisplay) {
      countDisplay.textContent = `${count} image${count !== 1 ? 's' : ''} selected`;
    }
  }

  async function handleBulkAddTag() {
    if (selectedIds.size === 0) return;

    const tagName = prompt('Enter tag name to add to selected images:');
    if (!tagName || !tagName.trim()) return;

    await performBulkAction('addTag', { tagName: tagName.trim() });
  }

  async function handleBulkRemoveTag() {
    if (selectedIds.size === 0) return;

    const tagId = prompt('Enter tag ID to remove from selected images:');
    if (!tagId || !tagId.trim()) return;

    const parsedTagId = parseInt(tagId.trim(), 10);
    if (isNaN(parsedTagId)) {
      alert('Please enter a valid tag ID number.');
      return;
    }

    await performBulkAction('removeTag', { tagId: parsedTagId });
  }

  async function handleBulkDelete() {
    if (selectedIds.size === 0) return;

    const count = selectedIds.size;
    if (!confirm(`Are you sure you want to delete ${count} image${count !== 1 ? 's' : ''}? This cannot be undone.`)) {
      return;
    }

    await performBulkAction('delete', null, true);
  }

  async function performBulkAction(action, payload, isDelete = false) {
    const imageIds = Array.from(selectedIds);
    const actionBar = document.getElementById('bulkActionBar');

    // Show loading state
    const buttons = actionBar ? actionBar.querySelectorAll('button') : [];
    buttons.forEach(btn => btn.disabled = true);

    try {
      const body = { imageIds, action };
      if (payload) body.payload = payload;

      const response = await fetch('/api/images/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Bulk operation failed');
      }

      const result = data.result;
      const succeeded = result.succeeded || [];
      const failed = result.failed || [];

      if (isDelete) {
        // Remove deleted cards from DOM
        succeeded.forEach(imageId => {
          const card = document.querySelector(`.image-card[data-image-id="${imageId}"]`);
          if (card) {
            card.style.opacity = '0';
            card.style.transform = 'scale(0.8)';
            card.style.transition = 'opacity 0.3s, transform 0.3s';
            setTimeout(() => card.remove(), 300);
          }
          selectedIds.delete(String(imageId));
        });
      } else {
        // Deselect successfully processed images
        succeeded.forEach(imageId => {
          const strId = String(imageId);
          selectedIds.delete(strId);
          const card = document.querySelector(`.image-card[data-image-id="${strId}"]`);
          if (card) {
            card.classList.remove('card--selected');
            const checkbox = card.querySelector('.card-checkbox');
            if (checkbox) checkbox.checked = false;
          }
        });
      }

      updateActionBar();

      // Report results
      if (failed.length > 0) {
        const failMessages = failed.map(f => `ID ${f.id}: ${f.error}`).join('\n');
        alert(`Operation completed with errors:\n\nSucceeded: ${succeeded.length}\nFailed: ${failed.length}\n\nErrors:\n${failMessages}`);
      } else {
        showToast(`✓ ${action} completed: ${succeeded.length} image${succeeded.length !== 1 ? 's' : ''} affected.`);
      }
    } catch (err) {
      console.error('Bulk action error:', err);
      alert(`Error: ${err.message}`);
    } finally {
      buttons.forEach(btn => btn.disabled = false);
    }
  }

  function showToast(message) {
    let toast = document.getElementById('bulkToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'bulkToast';
      toast.className = 'bulk-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('bulk-toast--visible');
    setTimeout(() => toast.classList.remove('bulk-toast--visible'), 3000);
  }

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();