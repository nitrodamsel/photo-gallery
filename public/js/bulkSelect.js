/**
 * Bulk Select - Gallery selection mode for bulk operations
 */
(function () {
  'use strict';

  let selectionMode = false;
  let selectedIds = new Set();
  let toggleBtn = null;
  let actionBar = null;
  let countEl = null;

  function init() {
    toggleBtn = document.getElementById('bulk-select-toggle');
    actionBar = document.getElementById('bulk-action-bar');
    countEl = document.getElementById('bulk-count');

    if (!toggleBtn || !actionBar) return;

    // Toggle selection mode
    toggleBtn.addEventListener('click', toggleSelectionMode);

    // Bulk action buttons
    const addTagBtn = document.getElementById('bulk-add-tag-btn');
    const removeTagBtn = document.getElementById('bulk-remove-tag-btn');
    const deleteBtn = document.getElementById('bulk-delete-btn');
    const cancelBtn = document.getElementById('bulk-cancel-btn');

    if (addTagBtn) addTagBtn.addEventListener('click', handleBulkAddTag);
    if (removeTagBtn) removeTagBtn.addEventListener('click', handleBulkRemoveTag);
    if (deleteBtn) deleteBtn.addEventListener('click', handleBulkDelete);
    if (cancelBtn) cancelBtn.addEventListener('click', exitSelectionMode);
  }

  function toggleSelectionMode() {
    if (selectionMode) {
      exitSelectionMode();
    } else {
      enterSelectionMode();
    }
  }

  function enterSelectionMode() {
    selectionMode = true;
    selectedIds.clear();

    if (toggleBtn) {
      toggleBtn.textContent = 'Exit Selection';
      toggleBtn.classList.add('active');
    }

    // Add checkboxes to all image cards
    const cards = document.querySelectorAll('.image-card');
    cards.forEach(card => {
      addCheckboxToCard(card);
    });

    updateActionBar();
  }

  function exitSelectionMode() {
    selectionMode = false;
    selectedIds.clear();

    if (toggleBtn) {
      toggleBtn.textContent = 'Select Images';
      toggleBtn.classList.remove('active');
    }

    // Remove all checkboxes
    const checkboxes = document.querySelectorAll('.bulk-checkbox-wrapper');
    checkboxes.forEach(cb => cb.remove());

    // Remove selected class from cards
    const cards = document.querySelectorAll('.image-card');
    cards.forEach(card => card.classList.remove('image-card--selected'));

    hideActionBar();
  }

  function addCheckboxToCard(card) {
    // Avoid duplicates
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

    wrapper.appendChild(checkbox);
    card.appendChild(wrapper);

    // Make card clickable to toggle checkbox (except links)
    card.addEventListener('click', onCardClick);
  }

  function onCardClick(e) {
    if (!selectionMode) return;

    // Don't intercept clicks on the actual links/buttons
    if (e.target.tagName === 'A' || e.target.tagName === 'BUTTON' ||
        e.target.classList.contains('bulk-checkbox')) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    const card = e.currentTarget;
    const checkbox = card.querySelector('.bulk-checkbox');
    if (checkbox) {
      checkbox.checked = !checkbox.checked;
      onCheckboxChange({ target: checkbox });
    }
  }

  function onCheckboxChange(e) {
    const checkbox = e.target;
    const imageId = parseInt(checkbox.dataset.imageId, 10);
    const card = checkbox.closest('.image-card');

    if (checkbox.checked) {
      selectedIds.add(imageId);
      if (card) card.classList.add('image-card--selected');
    } else {
      selectedIds.delete(imageId);
      if (card) card.classList.remove('image-card--selected');
    }

    updateActionBar();
  }

  function updateActionBar() {
    const count = selectedIds.size;

    if (countEl) {
      countEl.textContent = count;
    }

    if (count >= 1) {
      showActionBar();
    } else {
      // Still show bar in selection mode but with 0 count
      if (selectionMode) {
        showActionBar();
      } else {
        hideActionBar();
      }
    }
  }

  function showActionBar() {
    if (actionBar) {
      actionBar.classList.add('bulk-action-bar--visible');
    }
  }

  function hideActionBar() {
    if (actionBar) {
      actionBar.classList.remove('bulk-action-bar--visible');
    }
  }

  async function handleBulkAddTag() {
    if (selectedIds.size === 0) {
      alert('Please select at least one image.');
      return;
    }

    const tagName = prompt('Enter tag name to add:');
    if (!tagName || !tagName.trim()) return;

    await performBulkAction('addTag', { tagName: tagName.trim() });
  }

  async function handleBulkRemoveTag() {
    if (selectedIds.size === 0) {
      alert('Please select at least one image.');
      return;
    }

    const tagId = prompt('Enter tag ID to remove:');
    if (!tagId || isNaN(parseInt(tagId, 10))) {
      alert('Please enter a valid tag ID.');
      return;
    }

    await performBulkAction('removeTag', { tagId: parseInt(tagId, 10) });
  }

  async function handleBulkDelete() {
    if (selectedIds.size === 0) {
      alert('Please select at least one image.');
      return;
    }

    const count = selectedIds.size;
    if (!confirm(`Are you sure you want to delete ${count} image${count !== 1 ? 's' : ''}? This cannot be undone.`)) {
      return;
    }

    await performBulkAction('delete', null);
  }

  async function performBulkAction(action, payload) {
    const imageIds = Array.from(selectedIds);

    // Disable action bar buttons during operation
    setActionBarLoading(true);

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

      const result = data.result || {};
      const succeeded = result.succeeded || [];
      const failed = result.failed || [];

      // Show result summary
      let message = `Operation complete: ${succeeded.length} succeeded`;
      if (failed.length > 0) {
        message += `, ${failed.length} failed`;
        console.warn('Failed bulk operations:', failed);
      }

      // Update the gallery DOM
      if (action === 'delete') {
        // Remove deleted cards from DOM
        succeeded.forEach(id => {
          const card = document.querySelector(`.image-card[data-image-id="${id}"]`);
          if (card) {
            const cardContainer = card.closest('.gallery-item') || card;
            cardContainer.remove();
          }
        });
        selectedIds.clear();
      } else if (action === 'addTag' && result.tag) {
        // Visual feedback - cards still there, just show success
        succeeded.forEach(id => {
          const card = document.querySelector(`.image-card[data-image-id="${id}"]`);
          if (card) {
            card.classList.add('image-card--tagged');
            setTimeout(() => card.classList.remove('image-card--tagged'), 2000);
          }
        });
      }

      showNotification(message, failed.length > 0 ? 'warning' : 'success');

      // If all deleted, exit selection mode
      if (action === 'delete' && failed.length === 0) {
        exitSelectionMode();
      } else {
        updateActionBar();
      }

    } catch (err) {
      console.error('Bulk action error:', err);
      showNotification(`Error: ${err.message}`, 'error');
    } finally {
      setActionBarLoading(false);
    }
  }

  function setActionBarLoading(loading) {
    const buttons = actionBar
      ? actionBar.querySelectorAll('button')
      : [];
    buttons.forEach(btn => {
      btn.disabled = loading;
    });
  }

  function showNotification(message, type) {
    // Try to use existing notification system or create a simple one
    let notifEl = document.getElementById('bulk-notification');
    if (!notifEl) {
      notifEl = document.createElement('div');
      notifEl.id = 'bulk-notification';
      notifEl.className = 'bulk-notification';
      document.body.appendChild(notifEl);
    }

    notifEl.textContent = message;
    notifEl.className = `bulk-notification bulk-notification--${type} bulk-notification--visible`;

    clearTimeout(notifEl._timeout);
    notifEl._timeout = setTimeout(() => {
      notifEl.classList.remove('bulk-notification--visible');
    }, 4000);
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();