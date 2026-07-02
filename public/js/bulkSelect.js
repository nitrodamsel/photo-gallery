/**
 * Bulk Selection for Gallery Page
 * Enables multi-select mode with floating action bar
 */

(function () {
  'use strict';

  let selectionMode = false;
  const selectedIds = new Set();

  // DOM elements (initialized on DOMContentLoaded)
  let toggleBtn;
  let actionBar;
  let selectedCountEl;
  let cards;

  function init() {
    toggleBtn = document.getElementById('bulk-select-toggle');
    actionBar = document.getElementById('bulk-action-bar');
    selectedCountEl = document.getElementById('bulk-selected-count');

    if (!toggleBtn) return; // Not on gallery page

    toggleBtn.addEventListener('click', toggleSelectionMode);

    // Action bar buttons
    const addTagBtn = document.getElementById('bulk-add-tag-btn');
    const removeTagBtn = document.getElementById('bulk-remove-tag-btn');
    const deleteBtn = document.getElementById('bulk-delete-btn');
    const cancelBtn = document.getElementById('bulk-cancel-btn');

    if (addTagBtn) addTagBtn.addEventListener('click', handleAddTag);
    if (removeTagBtn) removeTagBtn.addEventListener('click', handleRemoveTag);
    if (deleteBtn) deleteBtn.addEventListener('click', handleDelete);
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

    toggleBtn.textContent = 'Cancel Selection';
    toggleBtn.classList.add('is-warning');
    toggleBtn.classList.remove('is-info');

    addCheckboxesToCards();
    updateActionBar();

    document.body.classList.add('bulk-select-mode');
  }

  function exitSelectionMode() {
    selectionMode = false;
    selectedIds.clear();

    toggleBtn.textContent = 'Select Multiple';
    toggleBtn.classList.remove('is-warning');
    toggleBtn.classList.add('is-info');

    removeCheckboxesFromCards();

    if (actionBar) {
      actionBar.classList.add('is-hidden');
    }

    document.body.classList.remove('bulk-select-mode');
  }

  function addCheckboxesToCards() {
    cards = document.querySelectorAll('.image-card');
    cards.forEach(card => {
      const imageId = card.dataset.imageId;
      if (!imageId) return;

      // Prevent duplicate checkboxes
      if (card.querySelector('.bulk-checkbox-wrapper')) return;

      const wrapper = document.createElement('div');
      wrapper.className = 'bulk-checkbox-wrapper';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'bulk-checkbox';
      checkbox.dataset.imageId = imageId;
      checkbox.setAttribute('aria-label', `Select image ${imageId}`);

      checkbox.addEventListener('change', function () {
        if (this.checked) {
          selectedIds.add(parseInt(imageId, 10));
          card.classList.add('is-selected');
        } else {
          selectedIds.delete(parseInt(imageId, 10));
          card.classList.remove('is-selected');
        }
        updateActionBar();
      });

      // Clicking the card overlay also toggles
      const overlay = document.createElement('div');
      overlay.className = 'bulk-card-overlay';
      overlay.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        checkbox.checked = !checkbox.checked;
        checkbox.dispatchEvent(new Event('change'));
      });

      wrapper.appendChild(checkbox);
      card.appendChild(wrapper);
      card.appendChild(overlay);
    });
  }

  function removeCheckboxesFromCards() {
    document.querySelectorAll('.bulk-checkbox-wrapper').forEach(el => el.remove());
    document.querySelectorAll('.bulk-card-overlay').forEach(el => el.remove());
    document.querySelectorAll('.image-card.is-selected').forEach(card => {
      card.classList.remove('is-selected');
    });
  }

  function updateActionBar() {
    if (!actionBar) return;

    const count = selectedIds.size;
    if (selectedCountEl) {
      selectedCountEl.textContent = count;
    }

    if (count > 0) {
      actionBar.classList.remove('is-hidden');
    } else {
      actionBar.classList.add('is-hidden');
    }
  }

  async function handleAddTag() {
    const tagName = prompt('Enter tag name to add to selected images:');
    if (!tagName || !tagName.trim()) return;

    const imageIds = Array.from(selectedIds);
    showLoadingState(true);

    try {
      const response = await fetch('/api/images/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageIds,
          action: 'addTag',
          payload: { tagName: tagName.trim() }
        })
      });

      const result = await response.json();

      if (!response.ok) {
        showNotification(`Error: ${result.error}`, 'is-danger');
        return;
      }

      const { succeeded, failed } = result;
      let message = `Tag "${tagName}" added to ${succeeded.length} image(s).`;
      if (failed.length > 0) {
        message += ` ${failed.length} failed.`;
      }
      showNotification(message, 'is-success');

      exitSelectionMode();
    } catch (err) {
      console.error('Bulk add tag error:', err);
      showNotification('Failed to add tag. Please try again.', 'is-danger');
    } finally {
      showLoadingState(false);
    }
  }

  async function handleRemoveTag() {
    const tagName = prompt('Enter tag name to remove from selected images:');
    if (!tagName || !tagName.trim()) return;

    // First find the tag by name
    let tagId;
    try {
      const resp = await fetch(`/api/tags/by-name/${encodeURIComponent(tagName.trim())}`);
      if (!resp.ok) {
        showNotification(`Tag "${tagName}" not found.`, 'is-warning');
        return;
      }
      const tagData = await resp.json();
      tagId = tagData.id;
    } catch (err) {
      showNotification('Failed to find tag.', 'is-danger');
      return;
    }

    const imageIds = Array.from(selectedIds);
    showLoadingState(true);

    try {
      const response = await fetch('/api/images/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageIds,
          action: 'removeTag',
          payload: { tagId }
        })
      });

      const result = await response.json();

      if (!response.ok) {
        showNotification(`Error: ${result.error}`, 'is-danger');
        return;
      }

      const { succeeded, failed } = result;
      let message = `Tag removed from ${succeeded.length} image(s).`;
      if (failed.length > 0) {
        message += ` ${failed.length} failed.`;
      }
      showNotification(message, 'is-success');

      exitSelectionMode();
    } catch (err) {
      console.error('Bulk remove tag error:', err);
      showNotification('Failed to remove tag. Please try again.', 'is-danger');
    } finally {
      showLoadingState(false);
    }
  }

  async function handleDelete() {
    const count = selectedIds.size;
    const confirmed = confirm(`Are you sure you want to delete ${count} image(s)? This cannot be undone.`);
    if (!confirmed) return;

    const imageIds = Array.from(selectedIds);
    showLoadingState(true);

    try {
      const response = await fetch('/api/images/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageIds,
          action: 'delete'
        })
      });

      const result = await response.json();

      if (!response.ok) {
        showNotification(`Error: ${result.error}`, 'is-danger');
        return;
      }

      const { succeeded, failed } = result;

      // Remove deleted cards from DOM
      succeeded.forEach(id => {
        const card = document.querySelector(`.image-card[data-image-id="${id}"]`);
        if (card) {
          const cardContainer = card.closest('.column') || card;
          cardContainer.remove();
        }
      });

      let message = `${succeeded.length} image(s) deleted.`;
      if (failed.length > 0) {
        message += ` ${failed.length} failed.`;
      }
      showNotification(message, 'is-success');

      exitSelectionMode();
    } catch (err) {
      console.error('Bulk delete error:', err);
      showNotification('Failed to delete images. Please try again.', 'is-danger');
    } finally {
      showLoadingState(false);
    }
  }

  function showLoadingState(loading) {
    const buttons = actionBar ? actionBar.querySelectorAll('button') : [];
    buttons.forEach(btn => {
      btn.disabled = loading;
    });
  }

  function showNotification(message, type = 'is-info') {
    // Remove existing notification
    const existing = document.getElementById('bulk-notification');
    if (existing) existing.remove();

    const notification = document.createElement('div');
    notification.id = 'bulk-notification';
    notification.className = `notification ${type}`;
    notification.style.cssText = 'position:fixed;top:20px;right:20px;z-index:9999;max-width:400px;';
    notification.innerHTML = `
      <button class="delete" aria-label="Close"></button>
      ${message}
    `;

    notification.querySelector('.delete').addEventListener('click', () => notification.remove());

    document.body.appendChild(notification);

    // Auto-dismiss after 4 seconds
    setTimeout(() => {
      if (notification.parentNode) notification.remove();
    }, 4000);
  }

  document.addEventListener('DOMContentLoaded', init);
})();