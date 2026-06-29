/**
 * Client-side tagging logic
 * - Tag input autocomplete using datalist and fetch
 * - addTag(imageId, name) posts to API and re-renders tag list in DOM
 * - removeTag(imageId, tagId) sends DELETE and removes badge from DOM
 * - Inline rename handler for tag management page
 */

(function () {
  'use strict';

  // ========================
  // Tag Autocomplete
  // ========================
  function initTagAutocomplete(inputEl, datalistEl) {
    if (!inputEl || !datalistEl) return;

    let debounceTimer;
    inputEl.addEventListener('input', function () {
      clearTimeout(debounceTimer);
      const query = this.value.trim();
      debounceTimer = setTimeout(async () => {
        if (query.length < 1) {
          datalistEl.innerHTML = '';
          return;
        }
        try {
          const res = await fetch(`/api/tags?q=${encodeURIComponent(query)}`);
          if (!res.ok) return;
          const tags = await res.json();
          datalistEl.innerHTML = '';
          tags.forEach(tag => {
            const option = document.createElement('option');
            option.value = tag.name;
            datalistEl.appendChild(option);
          });
        } catch (err) {
          console.error('Autocomplete error:', err);
        }
      }, 250);
    });
  }

  // ========================
  // Render Tag List
  // ========================
  function renderTagList(container, tags, imageId) {
    if (!container) return;
    container.innerHTML = '';

    if (!tags || tags.length === 0) {
      container.innerHTML = '<span class="text-muted small">No tags yet.</span>';
      return;
    }

    tags.forEach(tag => {
      const badge = document.createElement('span');
      badge.className = 'badge me-1 mb-1 tag-badge d-inline-flex align-items-center';
      badge.style.backgroundColor = tag.color || '#6c757d';
      badge.style.fontSize = '0.85em';
      badge.dataset.tagId = tag.id;
      badge.innerHTML = `
        <a href="/gallery?tag=${encodeURIComponent(tag.slug)}" 
           class="text-white text-decoration-none me-1">${escapeHtml(tag.name)}</a>
        <button type="button" 
          class="btn-close btn-close-white btn-remove-tag" 
          style="font-size: 0.6em; padding: 0; margin-left: 2px;"
          data-image-id="${imageId}" 
          data-tag-id="${tag.id}"
          aria-label="Remove tag ${escapeHtml(tag.name)}"></button>
      `;
      container.appendChild(badge);
    });

    // Re-attach remove handlers
    container.querySelectorAll('.btn-remove-tag').forEach(btn => {
      btn.addEventListener('click', function () {
        const imgId = parseInt(this.dataset.imageId, 10);
        const tagId = parseInt(this.dataset.tagId, 10);
        removeTag(imgId, tagId, container);
      });
    });
  }

  // ========================
  // Add Tag
  // ========================
  async function addTag(imageId, tagName, tagsContainer, feedbackEl) {
    if (!tagName || !tagName.trim()) return;
    tagName = tagName.trim();

    if (feedbackEl) {
      feedbackEl.textContent = 'Adding tag...';
      feedbackEl.className = 'small text-muted';
    }

    try {
      const res = await fetch(`/api/images/${imageId}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tagName })
      });

      const data = await res.json();

      if (!res.ok) {
        if (feedbackEl) {
          feedbackEl.textContent = data.error || 'Failed to add tag';
          feedbackEl.className = 'small text-danger';
        }
        return;
      }

      renderTagList(tagsContainer, data.tags, imageId);

      if (feedbackEl) {
        feedbackEl.textContent = '';
      }
    } catch (err) {
      console.error('Add tag error:', err);
      if (feedbackEl) {
        feedbackEl.textContent = 'Network error. Please try again.';
        feedbackEl.className = 'small text-danger';
      }
    }
  }

  // ========================
  // Remove Tag
  // ========================
  async function removeTag(imageId, tagId, tagsContainer) {
    try {
      const res = await fetch(`/api/images/${imageId}/tags/${tagId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await res.json();

      if (!res.ok) {
        console.error('Remove tag error:', data.error);
        showAlert('Failed to remove tag: ' + (data.error || 'Unknown error'), 'danger');
        return;
      }

      renderTagList(tagsContainer, data.tags, imageId);
    } catch (err) {
      console.error('Remove tag error:', err);
      showAlert('Network error. Please try again.', 'danger');
    }
  }

  // ========================
  // Tag Management Page: Inline Rename
  // ========================
  function initTagManagement() {
    const tagsTable = document.getElementById('tagsTableBody');
    if (!tagsTable) return;

    const alertContainer = document.getElementById('alertContainer');

    // ---- Create Tag Form ----
    const createForm = document.getElementById('createTagForm');
    if (createForm) {
      createForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        const nameInput = document.getElementById('newTagName');
        const colorInput = document.getElementById('newTagColor');
        const name = nameInput.value.trim();
        const color = colorInput.value;

        if (!name) return;

        try {
          const res = await fetch('/api/tags', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, color })
          });

          const data = await res.json();

          if (!res.ok) {
            showPageAlert(alertContainer, data.error || 'Failed to create tag', 'danger');
            return;
          }

          // Add new row to table
          addTagRow(data);
          updateTagCount(1);
          nameInput.value = '';
          showPageAlert(alertContainer, `Tag "${data.name}" created successfully!`, 'success');
        } catch (err) {
          showPageAlert(alertContainer, 'Network error. Please try again.', 'danger');
        }
      });
    }

    // ---- Edit/Delete buttons (event delegation) ----
    tagsTable.addEventListener('click', async function (e) {
      const target = e.target.closest('button');
      if (!target) return;

      const row = target.closest('tr');
      if (!row) return;

      const tagId = row.dataset.tagId;

      // Edit button
      if (target.classList.contains('btn-edit-tag')) {
        toggleEditMode(row, true);
        return;
      }

      // Cancel edit
      if (target.classList.contains('btn-cancel-edit')) {
        toggleEditMode(row, false);
        return;
      }

      // Save edit
      if (target.classList.contains('btn-save-tag')) {
        const nameInput = row.querySelector('.tag-name-input');
        const colorInput = row.querySelector('.tag-color-input');
        const newName = nameInput ? nameInput.value.trim() : '';
        const newColor = colorInput ? colorInput.value : '';

        if (!newName) {
          showPageAlert(alertContainer, 'Tag name cannot be empty', 'danger');
          return;
        }

        try {
          const res = await fetch(`/api/tags/${tagId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newName, color: newColor })
          });

          const data = await res.json();

          if (!res.ok) {
            showPageAlert(alertContainer, data.error || 'Failed to rename tag', 'danger');
            return;
          }

          updateTagRow(row, data);
          toggleEditMode(row, false);
          showPageAlert(alertContainer, `Tag renamed to "${data.name}" successfully!`, 'success');
        } catch (err) {
          showPageAlert(alertContainer, 'Network error. Please try again.', 'danger');
        }
        return;
      }

      // Delete button
      if (target.classList.contains('btn-delete-tag')) {
        const tagName = target.dataset.tagName || row.dataset.tagName;
        showDeleteModal(tagId, tagName);
        return;
      }
    });

    // ---- Delete Modal ----
    let pendingDeleteId = null;
    const deleteModal = document.getElementById('deleteTagModal');
    const confirmDeleteBtn = document.getElementById('confirmDeleteTag');

    function showDeleteModal(tagId, tagName) {
      pendingDeleteId = tagId;
      const nameEl = document.getElementById('deleteTagName');
      if (nameEl) nameEl.textContent = tagName;
      const modal = bootstrap.Modal.getOrCreateInstance(deleteModal);
      modal.show();
    }

    if (confirmDeleteBtn) {
      confirmDeleteBtn.addEventListener('click', async function () {
        if (!pendingDeleteId) return;

        try {
          const res = await fetch(`/api/tags/${pendingDeleteId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
          });

          const data = await res.json();
          const modal = bootstrap.Modal.getOrCreateInstance(deleteModal);
          modal.hide();

          if (!res.ok) {
            showPageAlert(alertContainer, data.error || 'Failed to delete tag', 'danger');
            return;
          }

          // Remove row from table
          const row = tagsTable.querySelector(`tr[data-tag-id="${pendingDeleteId}"]`);
          if (row) {
            row.remove();
          }
          updateTagCount(-1);

          // Show empty state if no rows left
          if (tagsTable.querySelectorAll('tr[data-tag-id]').length === 0) {
            tagsTable.innerHTML = `
              <tr id="emptyRow">
                <td colspan="6" class="text-center text-muted py-4">
                  <i class="bi bi-tags fs-2 d-block mb-2"></i>
                  No tags yet. Create your first tag above!
                </td>
              </tr>`;
          }

          showPageAlert(alertContainer, 'Tag deleted successfully!', 'success');
          pendingDeleteId = null;
        } catch (err) {
          showPageAlert(alertContainer, 'Network error. Please try again.', 'danger');
        }
      });
    }

    // ---- Tag Search/Filter ----
    const tagSearch = document.getElementById('tagSearch');
    if (tagSearch) {
      tagSearch.addEventListener('input', function () {
        const query = this.value.toLowerCase().trim();
        tagsTable.querySelectorAll('tr[data-tag-id]').forEach(row => {
          const name = (row.dataset.tagName || '').toLowerCase();
          const slug = (row.dataset.tagSlug || '').toLowerCase();
          row.style.display = (!query || name.includes(query) || slug.includes(query)) ? '' : 'none';
        });
      });
    }
  }

  // ========================
  // Helper: Toggle Edit Mode
  // ========================
  function toggleEditMode(row, editing) {
    const displayEl = row.querySelector('.tag-name-display');
    const editForm = row.querySelector('.tag-edit-form');
    const actionBtns = row.querySelector('.tag-action-buttons');

    if (editing) {
      if (displayEl) displayEl.classList.add('d-none');
      if (editForm) editForm.classList.remove('d-none');
      if (actionBtns) actionBtns.classList.add('d-none');
      // Focus input
      const input = row.querySelector('.tag-name-input');
      if (input) {
        input.focus();
        input.select();
      }
    } else {
      if (displayEl) displayEl.classList.remove('d-none');
      if (editForm) editForm.classList.add('d-none');
      if (actionBtns) actionBtns.classList.remove('d-none');
    }
  }

  // ========================
  // Helper: Update Row After Save
  // ========================
  function updateTagRow(row, tag) {
    row.dataset.tagName = tag.name;
    row.dataset.tagSlug = tag.slug;

    const colorSwatch = row.querySelector('.tag-color-swatch');
    if (colorSwatch) {
      colorSwatch.style.backgroundColor = tag.color || '#6c757d';
    }

    const badge = row.querySelector('.tag-name-display .badge');
    if (badge) {
      badge.textContent = tag.name;
      badge.style.backgroundColor = tag.color || '#6c757d';
    }

    const slugDisplay = row.querySelector('.tag-slug-display');
    if (slugDisplay) {
      slugDisplay.textContent = tag.slug;
    }

    const deleteBtn = row.querySelector('.btn-delete-tag');
    if (deleteBtn) {
      deleteBtn.dataset.tagName = tag.name;
    }

    // Update color input to reflect saved color
    const colorInput = row.querySelector('.tag-color-input');
    if (colorInput && tag.color) {
      colorInput.value = tag.color;
    }
  }

  // ========================
  // Helper: Add New Tag Row
  // ========================
  function addTagRow(tag) {
    const tbody = document.getElementById('tagsTableBody');
    if (!tbody) return;

    // Remove empty state row if present
    const emptyRow = document.getElementById('emptyRow');
    if (emptyRow) emptyRow.remove();

    const color = tag.color || '#6c757d';
    const createdDate = tag.createdAt ? new Date(tag.createdAt).toLocaleDateString() : 'N/A';

    const tr = document.createElement('tr');
    tr.dataset.tagId = tag.id;
    tr.dataset.tagName = tag.name;
    tr.dataset.tagSlug = tag.slug;
    tr.innerHTML = `
      <td>
        <span class="tag-color-swatch d-inline-block rounded" 
          style="width: 24px; height: 24px; background-color: ${color}; border: 1px solid rgba(0,0,0,0.1);"
          title="${color}"></span>
      </td>
      <td>
        <span class="tag-name-display">
          <span class="badge" style="background-color: ${color}; font-size: 0.9em;">
            ${escapeHtml(tag.name)}
          </span>
        </span>
        <div class="tag-edit-form d-none">
          <div class="input-group input-group-sm">
            <input type="text" class="form-control tag-name-input" value="${escapeHtml(tag.name)}" minlength="2" maxlength="30">
            <input type="color" class="form-control form-control-color tag-color-input" value="${color}" style="max-width: 50px;">
            <button class="btn btn-success btn-save-tag" data-tag-id="${tag.id}" title="Save">
              <i class="bi bi-check-lg"></i>
            </button>
            <button class="btn btn-outline-secondary btn-cancel-edit" title="Cancel">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
        </div>
      </td>
      <td><code class="tag-slug-display">${escapeHtml(tag.slug)}</code></td>
      <td>
        <a href="/gallery?tag=${encodeURIComponent(tag.slug)}" class="badge bg-secondary text-decoration-none tag-count">
          0 images
        </a>
      </td>
      <td class="text-muted small">${createdDate}</td>
      <td>
        <div class="btn-group btn-group-sm tag-action-buttons">
          <button class="btn btn-outline-primary btn-edit-tag" data-tag-id="${tag.id}" title="Edit">
            <i class="bi bi-pencil"></i>
          </button>
          <button class="btn btn-outline-danger btn-delete-tag" data-tag-id="${tag.id}" data-tag-name="${escapeHtml(tag.name)}" title="Delete">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      </td>
    `;
    tbody.insertBefore(tr, tbody.firstChild);
  }

  // ========================
  // Helper: Update Tag Count Display
  // ========================
  function updateTagCount(delta) {
    const countEl = document.getElementById('tagCount');
    if (countEl) {
      const current = parseInt(countEl.textContent, 10) || 0;
      countEl.textContent = Math.max(0, current + delta);
    }
  }

  // ========================
  // Helper: Show Page Alert
  // ========================
  function showPageAlert(container, message, type) {
    if (!container) return;
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} alert-dismissible fade show`;
    alert.innerHTML = `
      ${escapeHtml(message)}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    container.appendChild(alert);
    setTimeout(() => {
      if (alert.parentNode) alert.remove();
    }, 4000);
  }

  // ========================
  // Helper: Show Alert (for image detail page)
  // ========================
  function showAlert(message, type) {
    const container = document.querySelector('.alert-container') || document.querySelector('.container');
    if (!container) return;
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} alert-dismissible fade show mt-2`;
    alert.innerHTML = `
      ${escapeHtml(message)}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    container.prepend(alert);
    setTimeout(() => {
      if (alert.parentNode) alert.remove();
    }, 4000);
  }

  // ========================
  // Helper: Escape HTML
  // ========================
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // ========================
  // Init: Image Detail Page Tagging
  // ========================
  function initImageDetailTagging() {
    const tagInput = document.getElementById('tagInput');
    const tagDatalist = document.getElementById('tagSuggestions');
    const addTagBtn = document.getElementById('addTagBtn');
    const tagsContainer = document.getElementById('tagsContainer');
    const tagFeedback = document.getElementById('tagFeedback');

    if (!tagInput || !tagsContainer) return;

    const imageId = tagsContainer.dataset.imageId;
    if (!imageId) return;

    // Init autocomplete
    initTagAutocomplete(tagInput, tagDatalist);

    // Attach existing remove handlers
    tagsContainer.querySelectorAll('.btn-remove-tag').forEach(btn => {
      btn.addEventListener('click', function () {
        const imgId = parseInt(this.dataset.imageId, 10);
        const tagId = parseInt(this.dataset.tagId, 10);
        removeTag(imgId, tagId, tagsContainer);
      });
    });

    // Add tag on form submit
    const tagForm = document.getElementById('addTagForm');
    if (tagForm) {
      tagForm.addEventListener('submit', function (e) {
        e.preventDefault();
        const name = tagInput.value.trim();
        if (!name) return;
        addTag(parseInt(imageId, 10), name, tagsContainer, tagFeedback);
        tagInput.value = '';
      });
    }

    // Add tag on button click
    if (addTagBtn) {
      addTagBtn.addEventListener('click', function () {
        const name = tagInput.value.trim();
        if (!name) return;
        addTag(parseInt(imageId, 10), name, tagsContainer, tagFeedback);
        tagInput.value = '';
      });
    }
  }

  // ========================
  // Initialize
  // ========================
  document.addEventListener('DOMContentLoaded', function () {
    initTagManagement();
    initImageDetailTagging();
  });

  // Export for external use if needed
  window.TaggingModule = {
    addTag,
    removeTag,
    initTagAutocomplete,
    renderTagList
  };
})();