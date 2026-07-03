/**
 * bulkSelect.js — Gallery selection mode for bulk operations
 * Adds checkboxes to image cards, tracks selection, shows floating action bar
 */

(function () {
  'use strict';

  // --- State ---
  const selectedIds = new Set();
  let selectionModeActive = false;

  // --- DOM Elements ---
  const galleryGrid = document.getElementById('gallery-grid');
  const toggleBtn = document.getElementById('btn-bulk-select');
  const actionBar = document.getElementById('bulk-action-bar');
  const countEl = document.getElementById('bulk-selected-count');
  const btnAddTag = document.getElementById('bulk-btn-add-tag');
  const btnRemoveTag = document.getElementById('bulk-btn-remove-tag');
  const btnDelete = document.getElementById('bulk-btn-delete');
  const btnCancelBulk = document.getElementById('bulk-btn-cancel');
  const selectAllBtn = document.getElementById('bulk-btn-select-all');
  const deselectAllBtn = document.getElementById('bulk-btn-deselect-all');

  if (!galleryGrid || !toggleBtn) return; // Not on gallery page

  // --- Enable/Disable Selection Mode ---
  function enableSelectionMode() {
    selectionModeActive = true;
    toggleBtn.classList.add('active');
    toggleBtn.textContent = 'Cancel Selection';
    galleryGrid.classList.add('bulk-select-mode');
    addCheckboxesToCards();
    updateActionBar();
  }

  function disableSelectionMode() {
    selectionModeActive = false;
    toggleBtn.classList.remove('active');
    toggleBtn.textContent = 'Select Multiple';
    galleryGrid.classList.remove('bulk-select-mode');
    removeCheckboxesFromCards();
    selectedIds.clear();
    hideActionBar();
  }

  // --- Checkboxes ---
  function addCheckboxesToCards() {
    const cards = galleryGrid.querySelectorAll('.image-card[data-image-id]');
    cards.forEach(card => {
      if (card.querySelector('.bulk-checkbox-wrap')) return;

      const imageId = card.dataset.imageId;
      const wrap = document.createElement('div');
      wrap.className = 'bulk-checkbox-wrap';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'bulk-checkbox';
      checkbox.dataset.imageId = imageId;
      checkbox.setAttribute('aria-label', `Select image ${imageId}`);
      checkbox.checked = selectedIds.has(imageId);

      checkbox.addEventListener('change', () => handleCheckboxChange(checkbox, card));

      wrap.appendChild(checkbox);
      card.appendChild(wrap);

      // Make card clickable for selection in bulk mode
      card.addEventListener('click', handleCardClick);
    });
  }

  function removeCheckboxesFromCards() {
    galleryGrid.querySelectorAll('.bulk-checkbox-wrap').forEach(el => el.remove());
    galleryGrid.querySelectorAll('.image-card').forEach(card => {
      card.classList.remove('bulk-selected');
      card.removeEventListener('click', handleCardClick);
    });
  }

  function handleCardClick(e) {
    if (!selectionModeActive) return;
    // Don't trigger if clicking checkbox directly or anchor links
    if (e.target.closest('.bulk-checkbox-wrap') || e.target.tagName === 'A') return;
    e.preventDefault();

    const card = e.currentTarget;
    const checkbox = card.querySelector('.bulk-checkbox');
    if (checkbox) {
      checkbox.checked = !checkbox.checked;
      handleCheckboxChange(checkbox, card);
    }
  }

  function handleCheckboxChange(checkbox, card) {
    const imageId = checkbox.dataset.imageId;
    if (checkbox.checked) {
      selectedIds.add(imageId);
      card.classList.add('bulk-selected');
    } else {
      selectedIds.delete(imageId);
      card.classList.remove('bulk-selected');
    }
    updateActionBar();
  }

  // --- Action Bar ---
  function updateActionBar() {
    if (!actionBar) return;
    const count = selectedIds.size;
    if (countEl) countEl.textContent = count;

    if (count > 0) {
      showActionBar();
    } else {
      hideActionBar();
    }
  }

  function showActionBar() {
    if (!actionBar) return;
    actionBar.classList.add('bulk-action-bar--visible');
    actionBar.setAttribute('aria-hidden', 'false');
  }

  function hideActionBar() {
    if (!actionBar) return;
    actionBar.classList.remove('bulk-action-bar--visible');
    actionBar.setAttribute('aria-hidden', 'true');
  }

  // --- Bulk API Call ---
  async function bulkRequest(action, payload = {}) {
    const imageIds = Array.from(selectedIds).map(id => parseInt(id, 10));
    if (imageIds.length === 0) return;

    try {
      const response = await fetch('/api/images/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageIds, action, payload })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `Server error ${response.status}`);
      return data;
    } catch (err) {
      throw err;
    }
  }

  // --- Action Handlers ---
  async function handleAddTag() {
    const tagName = prompt('Enter tag name to add to selected images:');
    if (!tagName || !tagName.trim()) return;

    try {
      showLoadingState('Adding tag…');
      const result = await bulkRequest('addTag', { tagName: tagName.trim() });
      const { succeeded, failed } = result.result;
      showBulkResult(succeeded, failed, 'tag added');

      // Update card tags in DOM for succeeded images
      succeeded.forEach(imageId => {
        const card = galleryGrid.querySelector(`.image-card[data-image-id="${imageId}"]`);
        if (card) {
          addTagToCard(card, tagName.trim(), result.result.tagId);
        }
      });
    } catch (err) {
      alert(`Failed to add tag: ${err.message}`);
    } finally {
      clearLoadingState();
    }
  }

  async function handleRemoveTag() {
    const tagName = prompt('Enter tag name to remove from selected images:');
    if (!tagName || !tagName.trim()) return;

    try {
      showLoadingState('Removing tag…');
      const result = await bulkRequest('removeTag', { tagName: tagName.trim() });
      const { succeeded, failed } = result.result;
      showBulkResult(succeeded, failed, 'tag removed');

      // Remove tag badges from cards
      succeeded.forEach(imageId => {
        const card = galleryGrid.querySelector(`.image-card[data-image-id="${imageId}"]`);
        if (card) removeTagFromCard(card, tagName.trim());
      });
    } catch (err) {
      alert(`Failed to remove tag: ${err.message}`);
    } finally {
      clearLoadingState();
    }
  }

  async function handleDelete() {
    const count = selectedIds.size;
    if (!confirm(`Are you sure you want to delete ${count} image${count !== 1 ? 's' : ''}? This cannot be undone.`)) return;

    try {
      showLoadingState('Deleting…');
      const result = await bulkRequest('delete');
      const { succeeded, failed } = result.result;

      // Remove deleted cards from DOM
      succeeded.forEach(imageId => {
        const card = galleryGrid.querySelector(`.image-card[data-image-id="${imageId}"]`);
        if (card) {
          card.style.opacity = '0';
          card.style.transform = 'scale(0.9)';
          card.style.transition = 'opacity 0.3s, transform 0.3s';
          setTimeout(() => card.remove(), 300);
          selectedIds.delete(String(imageId));
        }
      });

      if (failed.length > 0) {
        alert(`Deleted ${succeeded.length} images. Failed to delete ${failed.length} images.`);
      }

      updateActionBar();
    } catch (err) {
      alert(`Failed to delete: ${err.message}`);
    } finally {
      clearLoadingState();
    }
  }

  // --- Card Tag DOM Helpers ---
  function addTagToCard(card, tagName, tagId) {
    let tagList = card.querySelector('.card-tags');
    if (!tagList) return;

    // Check if tag already exists
    const existing = tagList.querySelector(`[data-tag-name="${tagName}"]`);
    if (existing) return;

    const tagEl = document.createElement('a');
    tagEl.className = 'card-tag';
    tagEl.href = `/gallery?tag=${encodeURIComponent(tagName)}`;
    tagEl.dataset.tagName = tagName;
    tagEl.textContent = tagName;
    tagList.appendChild(tagEl);
  }

  function removeTagFromCard(card, tagName) {
    const tagEl = card.querySelector(`[data-tag-name="${tagName}"]`);
    if (tagEl) tagEl.remove();
  }

  // --- UI Feedback ---
  function showLoadingState(message) {
    if (btnAddTag) btnAddTag.disabled = true;
    if (btnRemoveTag) btnRemoveTag.disabled = true;
    if (btnDelete) btnDelete.disabled = true;

    const statusEl = document.getElementById('bulk-status');
    if (statusEl) {
      statusEl.textContent = message;
      statusEl.style.display = 'block';
    }
  }

  function clearLoadingState() {
    if (btnAddTag) btnAddTag.disabled = false;
    if (btnRemoveTag) btnRemoveTag.disabled = false;
    if (btnDelete) btnDelete.disabled = false;

    const statusEl = document.getElementById('bulk-status');
    if (statusEl) statusEl.style.display = 'none';
  }

  function showBulkResult(succeeded, failed, action) {
    let message = `${succeeded.length} image${succeeded.length !== 1 ? 's' : ''} had ${action} successfully.`;
    if (failed.length > 0) {
      message += ` ${failed.length} failed.`;
    }
    // Show temporary notification
    const notification = document.createElement('div');
    notification.className = 'bulk-notification';
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => {
      notification.classList.add('bulk-notification--visible');
    }, 10);
    setTimeout(() => {
      notification.classList.remove('bulk-notification--visible');
      setTimeout(() => notification.remove(), 400);
    }, 3000);
  }

  // --- Select All / Deselect All ---
  function selectAll() {
    galleryGrid.querySelectorAll('.bulk-checkbox').forEach(cb => {
      cb.checked = true;
      const card = cb.closest('.image-card');
      if (card) {
        selectedIds.add(cb.dataset.imageId);
        card.classList.add('bulk-selected');
      }
    });
    updateActionBar();
  }

  function deselectAll() {
    galleryGrid.querySelectorAll('.bulk-checkbox').forEach(cb => {
      cb.checked = false;
      const card = cb.closest('.image-card');
      if (card) card.classList.remove('bulk-selected');
    });
    selectedIds.clear();
    updateActionBar();
  }

  // --- Event Binding ---
  toggleBtn.addEventListener('click', () => {
    if (selectionModeActive) {
      disableSelectionMode();
    } else {
      enableSelectionMode();
    }
  });

  if (btnCancelBulk) btnCancelBulk.addEventListener('click', disableSelectionMode);
  if (btnAddTag) btnAddTag.addEventListener('click', handleAddTag);
  if (btnRemoveTag) btnRemoveTag.addEventListener('click', handleRemoveTag);
  if (btnDelete) btnDelete.addEventListener('click', handleDelete);
  if (selectAllBtn) selectAllBtn.addEventListener('click', selectAll);
  if (deselectAllBtn) deselectAllBtn.addEventListener('click', deselectAll);

  // Keyboard shortcut: Escape to exit selection mode
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && selectionModeActive) {
      disableSelectionMode();
    }
  });

})();