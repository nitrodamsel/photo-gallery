/**
 * Bulk Selection Mode for Gallery
 * Handles checkbox selection, floating action bar, and bulk API requests
 */

(function () {
  'use strict';

  const selectedIds = new Set();
  let bulkModeActive = false;

  // DOM references
  let toggleBtn = null;
  let actionBar = null;
  let actionBarCount = null;
  let cards = [];

  function init() {
    toggleBtn = document.getElementById('bulk-select-toggle');
    actionBar = document.getElementById('bulk-action-bar');
    actionBarCount = document.getElementById('bulk-selected-count');

    if (!toggleBtn || !actionBar) return;

    toggleBtn.addEventListener('click', toggleBulkMode);

    // Action bar buttons
    const addTagBtn = document.getElementById('bulk-add-tag');
    const removeTagBtn = document.getElementById('bulk-remove-tag');
    const deleteBtn = document.getElementById('bulk-delete');
    const cancelBtn = document.getElementById('bulk-cancel');

    if (addTagBtn) addTagBtn.addEventListener('click', handleAddTag);
    if (removeTagBtn) removeTagBtn.addEventListener('click', handleRemoveTag);
    if (deleteBtn) deleteBtn.addEventListener('click', handleDelete);
    if (cancelBtn) cancelBtn.addEventListener('click', exitBulkMode);
  }

  function toggleBulkMode() {
    if (bulkModeActive) {
      exitBulkMode();
    } else {
      enterBulkMode();
    }
  }

  function enterBulkMode() {
    bulkModeActive = true;
    selectedIds.clear();

    toggleBtn.textContent = 'Exit Selection';
    toggleBtn.classList.add('is-warning');
    toggleBtn.classList.remove('is-light');

    // Get all image cards
    cards = Array.from(document.querySelectorAll('.image-card'));

    cards.forEach(card => {
      const imageId = card.dataset.imageId;
      if (!imageId) return;

      // Add checkbox overlay
      const overlay = document.createElement('div');
      overlay.className = 'bulk-checkbox-overlay';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'bulk-checkbox';
      checkbox.dataset.imageId = imageId;
      checkbox.addEventListener('change', () => handleCheckboxChange(checkbox, imageId));

      overlay.appendChild(checkbox);
      card.style.position = 'relative';
      card.appendChild(overlay);

      // Make whole card clickable in bulk mode
      card.addEventListener('click', handleCardClick);
      card.classList.add('bulk-selectable');
    });

    updateActionBar();
  }

  function exitBulkMode() {
    bulkModeActive = false;
    selectedIds.clear();

    toggleBtn.textContent = 'Select Images';
    toggleBtn.classList.remove('is-warning');
    toggleBtn.classList.add('is-light');

    // Remove checkboxes and overlays
    document.querySelectorAll('.bulk-checkbox-overlay').forEach(el => el.remove());

    cards.forEach(card => {
      card.removeEventListener('click', handleCardClick);
      card.classList.remove('bulk-selectable', 'bulk-selected');
    });

    cards = [];
    actionBar.classList.add('is-hidden');
  }

  function handleCardClick(e) {
    // Don't interfere with actual links unless in bulk mode
    if (!bulkModeActive) return;

    // Prevent navigation to image detail
    const link = e.target.closest('a');
    if (link && !e.target.classList.contains('bulk-checkbox')) {
      e.preventDefault();
    }

    const card = e.currentTarget;
    const imageId = card.dataset.imageId;
    if (!imageId) return;

    const checkbox = card.querySelector('.bulk-checkbox');
    if (checkbox && e.target !== checkbox) {
      checkbox.checked = !checkbox.checked;
      handleCheckboxChange(checkbox, imageId);
    }
  }

  function handleCheckboxChange(checkbox, imageId) {
    if (checkbox.checked) {
      selectedIds.add(imageId);
      checkbox.closest('.image-card').classList.add('bulk-selected');
    } else {
      selectedIds.delete(imageId);
      checkbox.closest('.image-card').classList.remove('bulk-selected');
    }
    updateActionBar();
  }

  function updateActionBar() {
    const count = selectedIds.size;

    if (count > 0) {
      actionBar.classList.remove('is-hidden');
      if (actionBarCount) {
        actionBarCount.textContent = `${count} image${count !== 1 ? 's' : ''} selected`;
      }
    } else {
      actionBar.classList.add('is-hidden');
    }
  }

  async function handleAddTag() {
    if (selectedIds.size === 0) return;

    const tagName = prompt('Enter tag name to add:');
    if (!tagName || !tagName.trim()) return;

    try {
      const result = await bulkRequest({
        imageIds: Array.from(selectedIds).map(Number),
        action: 'addTag',
        payload: { tagName: tagName.trim() }
      });

      showNotification(
        `Tag "${tagName}" added to ${result.succeeded.length} image(s)` +
        (result.failed.length ? `. ${result.failed.length} failed.` : ''),
        result.failed.length ? 'is-warning' : 'is-success'
      );
    } catch (err) {
      showNotification(`Error: ${err.message}`, 'is-danger');
    }
  }

  async function handleRemoveTag() {
    if (selectedIds.size === 0) return;

    const tagInput = prompt('Enter tag ID or name to remove:');
    if (!tagInput || !tagInput.trim()) return;

    // If numeric, treat as ID; otherwise try to find by name
    let tagId = null;
    if (/^\d+$/.test(tagInput.trim())) {
      tagId = parseInt(tagInput.trim(), 10);
    } else {
      // Try to find tag by name via API
      try {
        const resp = await fetch(`/api/tags?name=${encodeURIComponent(tagInput.trim())}`);
        if (resp.ok) {
          const data = await resp.json();
          if (data && data.id) tagId = data.id;
          else if (Array.isArray(data) && data.length > 0) tagId = data[0].id;
        }
      } catch (e) {
        // ignore
      }
    }

    if (!tagId) {
      showNotification('Could not find tag. Please use the tag ID number.', 'is-warning');
      return;
    }

    try {
      const result = await bulkRequest({
        imageIds: Array.from(selectedIds).map(Number),
        action: 'removeTag',
        payload: { tagId }
      });

      showNotification(
        `Tag removed from ${result.succeeded.length} image(s)` +
        (result.failed.length ? `. ${result.failed.length} failed.` : ''),
        result.failed.length ? 'is-warning' : 'is-success'
      );
    } catch (err) {
      showNotification(`Error: ${err.message}`, 'is-danger');
    }
  }

  async function handleDelete() {
    if (selectedIds.size === 0) return;

    const count = selectedIds.size;
    if (!confirm(`Are you sure you want to delete ${count} image${count !== 1 ? 's' : ''}? This cannot be undone.`)) {
      return;
    }

    try {
      const idsToDelete = Array.from(selectedIds).map(Number);
      const result = await bulkRequest({
        imageIds: idsToDelete,
        action: 'delete'
      });

      // Remove deleted cards from DOM
      result.succeeded.forEach(id => {
        const card = document.querySelector(`.image-card[data-image-id="${id}"]`);
        if (card) {
          // Remove parent column wrapper if present
          const col = card.closest('.column');
          if (col) col.remove();
          else card.remove();
        }
        selectedIds.delete(String(id));
      });

      showNotification(
        `${result.succeeded.length} image${result.succeeded.length !== 1 ? 's' : ''} deleted` +
        (result.failed.length ? `. ${result.failed.length} failed.` : ''),
        result.failed.length ? 'is-warning' : 'is-success'
      );

      updateActionBar();

      // If no more images, show empty state
      const remainingCards = document.querySelectorAll('.image-card');
      if (remainingCards.length === 0) {
        const gallery = document.getElementById('gallery-grid');
        if (gallery) {
          gallery.innerHTML = '<div class="column is-full"><p class="has-text-centered has-text-grey">No images found.</p></div>';
        }
        exitBulkMode();
      }
    } catch (err) {
      showNotification(`Error: ${err.message}`, 'is-danger');
    }
  }

  async function bulkRequest(body) {
    const response = await fetch('/api/images/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Bulk request failed');
    }

    return data;
  }

  function showNotification(message, type = 'is-info') {
    // Remove existing notifications
    document.querySelectorAll('.bulk-notification').forEach(el => el.remove());

    const notification = document.createElement('div');
    notification.className = `notification ${type} bulk-notification`;
    notification.style.cssText = 'position: fixed; top: 1rem; right: 1rem; z-index: 9999; max-width: 400px; animation: fadeIn 0.3s ease;';
    notification.innerHTML = `
      <button class="delete"></button>
      ${message}
    `;

    notification.querySelector('.delete').addEventListener('click', () => notification.remove());
    document.body.appendChild(notification);

    // Auto-remove after 4 seconds
    setTimeout(() => {
      if (notification.parentNode) notification.remove();
    }, 4000);
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();