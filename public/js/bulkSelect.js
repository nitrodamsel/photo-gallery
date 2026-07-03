/**
 * Bulk Selection Mode for Gallery Page
 * Handles checkbox selection, floating action bar, and bulk API operations.
 */
(function () {
  'use strict';

  const selectedIds = new Set();
  let selectionModeActive = false;

  // DOM references (populated on init)
  let toggleBtn;
  let actionBar;
  let actionBarCount;
  let addTagBtn;
  let removeTagBtn;
  let deleteBtn;

  function init() {
    toggleBtn = document.getElementById('bulk-select-toggle');
    actionBar = document.getElementById('bulk-action-bar');
    actionBarCount = document.getElementById('bulk-action-count');
    addTagBtn = document.getElementById('bulk-add-tag');
    removeTagBtn = document.getElementById('bulk-remove-tag');
    deleteBtn = document.getElementById('bulk-delete');

    if (!toggleBtn) return; // Not on gallery page

    toggleBtn.addEventListener('click', toggleSelectionMode);

    if (addTagBtn) addTagBtn.addEventListener('click', handleAddTag);
    if (removeTagBtn) removeTagBtn.addEventListener('click', handleRemoveTag);
    if (deleteBtn) deleteBtn.addEventListener('click', handleDelete);

    const cancelBtn = document.getElementById('bulk-cancel');
    if (cancelBtn) cancelBtn.addEventListener('click', exitSelectionMode);
  }

  function toggleSelectionMode() {
    if (selectionModeActive) {
      exitSelectionMode();
    } else {
      enterSelectionMode();
    }
  }

  function enterSelectionMode() {
    selectionModeActive = true;
    toggleBtn.textContent = 'Exit Selection';
    toggleBtn.classList.add('is-warning');
    toggleBtn.classList.remove('is-info');
    document.body.classList.add('bulk-select-mode');
    addCheckboxesToCards();
    updateActionBar();
  }

  function exitSelectionMode() {
    selectionModeActive = false;
    selectedIds.clear();
    toggleBtn.textContent = 'Select Images';
    toggleBtn.classList.remove('is-warning');
    toggleBtn.classList.add('is-info');
    document.body.classList.remove('bulk-select-mode');
    removeCheckboxesFromCards();
    updateActionBar();
  }

  function addCheckboxesToCards() {
    const cards = document.querySelectorAll('.image-card');
    cards.forEach(card => {
      if (card.querySelector('.bulk-checkbox-wrapper')) return;

      const imageId = card.dataset.imageId;
      if (!imageId) return;

      const wrapper = document.createElement('div');
      wrapper.className = 'bulk-checkbox-wrapper';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'bulk-checkbox';
      checkbox.dataset.imageId = imageId;
      checkbox.addEventListener('change', onCheckboxChange);

      // Clicking the card overlay also toggles
      const overlay = document.createElement('div');
      overlay.className = 'bulk-card-overlay';
      overlay.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        checkbox.checked = !checkbox.checked;
        checkbox.dispatchEvent(new Event('change'));
      });

      wrapper.appendChild(checkbox);
      card.appendChild(wrapper);
      card.appendChild(overlay);
      card.classList.add('bulk-selectable');
    });
  }

  function removeCheckboxesFromCards() {
    document.querySelectorAll('.bulk-checkbox-wrapper').forEach(el => el.remove());
    document.querySelectorAll('.bulk-card-overlay').forEach(el => el.remove());
    document.querySelectorAll('.image-card').forEach(card => {
      card.classList.remove('bulk-selectable', 'bulk-selected');
    });
  }

  function onCheckboxChange(e) {
    const imageId = parseInt(e.target.dataset.imageId, 10);
    const card = e.target.closest('.image-card') ||
      document.querySelector(`.image-card[data-image-id="${imageId}"]`);

    if (e.target.checked) {
      selectedIds.add(imageId);
      if (card) card.classList.add('bulk-selected');
    } else {
      selectedIds.delete(imageId);
      if (card) card.classList.remove('bulk-selected');
    }
    updateActionBar();
  }

  function updateActionBar() {
    if (!actionBar) return;
    const count = selectedIds.size;
    if (count > 0 && selectionModeActive) {
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
      showLoading(addTagBtn);
      const result = await bulkApiRequest({
        imageIds: Array.from(selectedIds),
        action: 'addTag',
        payload: { tagName: tagName.trim() }
      });
      showResult(result, `Tag "${tagName}" added`);
    } catch (err) {
      showError(err.message);
    } finally {
      hideLoading(addTagBtn, 'Add Tag');
    }
  }

  async function handleRemoveTag() {
    if (selectedIds.size === 0) return;
    const tagName = prompt('Enter tag name to remove:');
    if (!tagName || !tagName.trim()) return;

    try {
      showLoading(removeTagBtn);
      const result = await bulkApiRequest({
        imageIds: Array.from(selectedIds),
        action: 'removeTag',
        payload: { tagName: tagName.trim() }
      });
      showResult(result, `Tag "${tagName}" removed`);
    } catch (err) {
      showError(err.message);
    } finally {
      hideLoading(removeTagBtn, 'Remove Tag');
    }
  }

  async function handleDelete() {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;
    if (!confirm(`Are you sure you want to delete ${count} image${count !== 1 ? 's' : ''}? This cannot be undone.`)) {
      return;
    }

    try {
      showLoading(deleteBtn);
      const result = await bulkApiRequest({
        imageIds: Array.from(selectedIds),
        action: 'delete',
        payload: {}
      });

      // Remove deleted cards from the DOM
      if (result.succeeded && result.succeeded.length > 0) {
        result.succeeded.forEach(id => {
          const card = document.querySelector(`.image-card[data-image-id="${id}"]`);
          if (card) {
            const col = card.closest('.column') || card;
            col.remove();
          }
          selectedIds.delete(id);
        });
      }

      showResult(result, `${result.succeeded ? result.succeeded.length : 0} image(s) deleted`);
      updateActionBar();
    } catch (err) {
      showError(err.message);
    } finally {
      hideLoading(deleteBtn, 'Delete');
    }
  }

  async function bulkApiRequest(body) {
    const response = await fetch('/api/images/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Bulk operation failed');
    }
    return data.result;
  }

  function showLoading(btn) {
    if (btn) {
      btn.dataset.originalText = btn.textContent;
      btn.textContent = 'Processing...';
      btn.disabled = true;
    }
  }

  function hideLoading(btn, fallbackText) {
    if (btn) {
      btn.textContent = btn.dataset.originalText || fallbackText;
      btn.disabled = false;
    }
  }

  function showResult(result, successMsg) {
    const succeeded = result.succeeded ? result.succeeded.length : 0;
    const failed = result.failed ? result.failed.length : 0;

    let msg = successMsg ? `✓ ${successMsg}` : `✓ Operation complete`;
    if (failed > 0) {
      msg += ` (${failed} failed)`;
    }

    showNotification(msg, failed > 0 ? 'is-warning' : 'is-success');
  }

  function showError(message) {
    showNotification(`✗ Error: ${message}`, 'is-danger');
  }

  function showNotification(message, cssClass) {
    // Remove any existing notification
    const existing = document.getElementById('bulk-notification');
    if (existing) existing.remove();

    const notification = document.createElement('div');
    notification.id = 'bulk-notification';
    notification.className = `notification ${cssClass} bulk-notification`;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 4000);
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();