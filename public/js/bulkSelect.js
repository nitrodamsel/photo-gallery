/**
 * bulkSelect.js
 * Gallery selection mode — toggle checkboxes on cards, track selection,
 * show floating action bar, dispatch bulk API requests.
 */
(function () {
  'use strict';

  // ─── State ────────────────────────────────────────────────────────────────
  let selectionMode = false;
  const selectedIds = new Set();

  // ─── DOM refs ──────────────────────────────────────────────────────────────
  const toggleBtn = document.getElementById('bulk-select-toggle');
  const actionBar = document.getElementById('bulk-action-bar');
  const selectionCount = document.getElementById('bulk-selection-count');
  const bulkTagBtn = document.getElementById('bulk-tag-btn');
  const bulkUntagBtn = document.getElementById('bulk-untag-btn');
  const bulkDeleteBtn = document.getElementById('bulk-delete-btn');
  const bulkClearBtn = document.getElementById('bulk-clear-btn');
  const selectAllBtn = document.getElementById('bulk-select-all-btn');

  // ─── Init ──────────────────────────────────────────────────────────────────
  function init() {
    if (!toggleBtn) return; // Not on gallery page

    bindEvents();
  }

  // ─── Toggle selection mode ────────────────────────────────────────────────
  function enableSelectionMode() {
    selectionMode = true;
    toggleBtn.classList.add('active');
    toggleBtn.setAttribute('aria-pressed', 'true');
    toggleBtn.title = 'Exit selection mode';
    document.body.classList.add('bulk-select-active');

    // Add checkboxes to all cards
    document.querySelectorAll('.image-card').forEach(addCheckboxToCard);
  }

  function disableSelectionMode() {
    selectionMode = false;
    toggleBtn.classList.remove('active');
    toggleBtn.setAttribute('aria-pressed', 'false');
    toggleBtn.title = 'Select multiple images';
    document.body.classList.remove('bulk-select-active');

    // Remove all checkboxes
    document.querySelectorAll('.image-card-checkbox-wrap').forEach(el => el.remove());

    // Clear selection
    selectedIds.clear();
    hideActionBar();
  }

  // ─── Card checkbox helpers ────────────────────────────────────────────────
  function addCheckboxToCard(card) {
    if (card.querySelector('.image-card-checkbox-wrap')) return; // Already has one

    const imageId = card.dataset.imageId;
    if (!imageId) return;

    const wrap = document.createElement('div');
    wrap.className = 'image-card-checkbox-wrap';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'image-card-checkbox';
    checkbox.id = `card-checkbox-${imageId}`;
    checkbox.setAttribute('aria-label', `Select image ${imageId}`);
    checkbox.checked = selectedIds.has(Number(imageId));

    checkbox.addEventListener('change', function () {
      const id = Number(imageId);
      if (checkbox.checked) {
        selectedIds.add(id);
        card.classList.add('image-card--selected');
      } else {
        selectedIds.delete(id);
        card.classList.remove('image-card--selected');
      }
      updateActionBar();
    });

    // Also toggle on card click (not link clicks)
    card.addEventListener('click', handleCardClick);

    wrap.appendChild(checkbox);
    card.appendChild(wrap);
  }

  function handleCardClick(e) {
    // Only in selection mode and not clicking links/buttons
    if (!selectionMode) return;
    if (e.target.closest('a') && !e.target.closest('.image-card-checkbox-wrap')) {
      e.preventDefault();
    }
    if (e.target.tagName === 'INPUT') return; // Handled by checkbox change

    const card = e.currentTarget;
    const checkbox = card.querySelector('.image-card-checkbox');
    if (checkbox) {
      checkbox.checked = !checkbox.checked;
      checkbox.dispatchEvent(new Event('change'));
    }
  }

  // ─── Action bar ───────────────────────────────────────────────────────────
  function updateActionBar() {
    const count = selectedIds.size;
    if (count > 0) {
      showActionBar(count);
    } else {
      hideActionBar();
    }
  }

  function showActionBar(count) {
    if (!actionBar) return;
    actionBar.classList.add('bulk-action-bar--visible');
    if (selectionCount) {
      selectionCount.textContent = `${count} image${count === 1 ? '' : 's'} selected`;
    }
  }

  function hideActionBar() {
    if (!actionBar) return;
    actionBar.classList.remove('bulk-action-bar--visible');
    if (selectionCount) {
      selectionCount.textContent = '0 images selected';
    }
  }

  // ─── Bulk API calls ───────────────────────────────────────────────────────
  async function sendBulkRequest(action, payload = {}) {
    const imageIds = Array.from(selectedIds);

    const res = await fetch('/api/images/bulk', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ imageIds, action, payload })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Bulk operation failed');
    }
    return data;
  }

  async function handleBulkTag() {
    const tagName = window.prompt('Enter tag name to add to selected images:');
    if (!tagName || !tagName.trim()) return;

    setActionBarLoading(true);
    try {
      const data = await sendBulkRequest('tag', { tagName: tagName.trim() });
      const { succeeded, failed } = data.result;
      showBulkResult(`Tagged ${succeeded.length} image(s)`, failed);
      refreshSucceededCards(succeeded);
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setActionBarLoading(false);
    }
  }

  async function handleBulkUntag() {
    const tagIdStr = window.prompt('Enter tag ID to remove from selected images:');
    const tagId = parseInt(tagIdStr, 10);
    if (!tagId) return;

    setActionBarLoading(true);
    try {
      const data = await sendBulkRequest('untag', { tagId });
      const { succeeded, failed } = data.result;
      showBulkResult(`Untagged ${succeeded.length} image(s)`, failed);
      refreshSucceededCards(succeeded);
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setActionBarLoading(false);
    }
  }

  async function handleBulkDelete() {
    const count = selectedIds.size;
    const confirmed = window.confirm(
      `Delete ${count} image${count === 1 ? '' : 's'}? This cannot be undone.`
    );
    if (!confirmed) return;

    setActionBarLoading(true);
    try {
      const data = await sendBulkRequest('delete');
      const { succeeded, failed } = data.result;

      // Remove deleted cards from DOM
      succeeded.forEach(id => {
        const card = document.querySelector(`.image-card[data-image-id="${id}"]`);
        if (card) {
          card.style.transition = 'opacity 0.3s, transform 0.3s';
          card.style.opacity = '0';
          card.style.transform = 'scale(0.9)';
          setTimeout(() => card.remove(), 300);
        }
        selectedIds.delete(id);
      });

      showBulkResult(`Deleted ${succeeded.length} image(s)`, failed);
      updateActionBar();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setActionBarLoading(false);
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────
  function setActionBarLoading(loading) {
    if (!actionBar) return;
    const btns = actionBar.querySelectorAll('button');
    btns.forEach(btn => { btn.disabled = loading; });
    if (loading) {
      actionBar.classList.add('bulk-action-bar--loading');
    } else {
      actionBar.classList.remove('bulk-action-bar--loading');
    }
  }

  function showBulkResult(successMsg, failed) {
    if (failed && failed.length > 0) {
      const failList = failed.map(f => `ID ${f.id}: ${f.error}`).join('\n');
      alert(`${successMsg}\n\n${failed.length} failed:\n${failList}`);
    } else {
      // Show brief toast-style notification
      showToast(successMsg, 'success');
    }
  }

  function showToast(message, type = 'info') {
    const existing = document.querySelector('.bulk-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `bulk-toast bulk-toast--${type}`;
    toast.textContent = message;
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    document.body.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.add('bulk-toast--visible');
    });

    setTimeout(() => {
      toast.classList.remove('bulk-toast--visible');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  function refreshSucceededCards(succeededIds) {
    // Visual flash on affected cards to indicate update
    succeededIds.forEach(id => {
      const card = document.querySelector(`.image-card[data-image-id="${id}"]`);
      if (card) {
        card.classList.add('image-card--updated');
        setTimeout(() => card.classList.remove('image-card--updated'), 1500);
      }
    });
  }

  // ─── Select All ───────────────────────────────────────────────────────────
  function handleSelectAll() {
    const allCards = document.querySelectorAll('.image-card[data-image-id]');
    const allSelected = allCards.length > 0 && Array.from(allCards).every(card =>
      selectedIds.has(Number(card.dataset.imageId))
    );

    allCards.forEach(card => {
      const id = Number(card.dataset.imageId);
      const checkbox = card.querySelector('.image-card-checkbox');

      if (allSelected) {
        // Deselect all
        selectedIds.delete(id);
        card.classList.remove('image-card--selected');
        if (checkbox) checkbox.checked = false;
      } else {
        // Select all
        selectedIds.add(id);
        card.classList.add('image-card--selected');
        if (checkbox) checkbox.checked = true;
      }
    });

    updateActionBar();
  }

  // ─── Event bindings ───────────────────────────────────────────────────────
  function bindEvents() {
    toggleBtn.addEventListener('click', function () {
      if (selectionMode) {
        disableSelectionMode();
      } else {
        enableSelectionMode();
      }
    });

    if (bulkTagBtn) bulkTagBtn.addEventListener('click', handleBulkTag);
    if (bulkUntagBtn) bulkUntagBtn.addEventListener('click', handleBulkUntag);
    if (bulkDeleteBtn) bulkDeleteBtn.addEventListener('click', handleBulkDelete);
    if (bulkClearBtn) {
      bulkClearBtn.addEventListener('click', function () {
        selectedIds.clear();
        document.querySelectorAll('.image-card-checkbox').forEach(cb => { cb.checked = false; });
        document.querySelectorAll('.image-card--selected').forEach(card => {
          card.classList.remove('image-card--selected');
        });
        hideActionBar();
      });
    }
    if (selectAllBtn) selectAllBtn.addEventListener('click', handleSelectAll);
  }

  // ─── Boot ─────────────────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();