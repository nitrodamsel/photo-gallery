/**
 * Client-side tagging logic
 * Handles tag input autocomplete, add/remove tags via API, and inline rename
 */

(function () {
  'use strict';

  // ─── Autocomplete Setup ───────────────────────────────────────────────────

  function setupTagAutocomplete(inputEl, datalistEl) {
    if (!inputEl || !datalistEl) return;

    let debounceTimer = null;

    inputEl.addEventListener('input', function () {
      clearTimeout(debounceTimer);
      const q = this.value.trim();

      if (q.length < 1) {
        datalistEl.innerHTML = '';
        return;
      }

      debounceTimer = setTimeout(async () => {
        try {
          const res = await fetch(`/api/tags?q=${encodeURIComponent(q)}`);
          if (!res.ok) return;
          const tags = await res.json();
          datalistEl.innerHTML = tags
            .map(t => `<option value="${escapeHtml(t.name)}"></option>`)
            .join('');
        } catch (err) {
          console.error('Autocomplete fetch error:', err);
        }
      }, 200);
    });
  }

  // ─── Add Tag ─────────────────────────────────────────────────────────────

  async function addTag(imageId, tagName, containerEl) {
    if (!tagName || tagName.trim().length < 2) {
      showTagMessage(containerEl, 'Tag name must be at least 2 characters.', 'danger');
      return;
    }

    try {
      const res = await fetch(`/api/images/${imageId}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tagName: tagName.trim() })
      });

      const data = await res.json();

      if (!res.ok) {
        showTagMessage(containerEl, data.error || 'Failed to add tag.', 'danger');
        return;
      }

      renderTagList(imageId, data.tags, containerEl);
      showTagMessage(containerEl, `Tag "${tagName}" added.`, 'success');
    } catch (err) {
      console.error('addTag error:', err);
      showTagMessage(containerEl, 'Network error. Please try again.', 'danger');
    }
  }

  // ─── Remove Tag ──────────────────────────────────────────────────────────

  async function removeTag(imageId, tagId, containerEl) {
    try {
      const res = await fetch(`/api/images/${imageId}/tags/${tagId}`, {
        method: 'DELETE'
      });

      const data = await res.json();

      if (!res.ok) {
        showTagMessage(containerEl, data.error || 'Failed to remove tag.', 'danger');
        return;
      }

      renderTagList(imageId, data.tags, containerEl);
    } catch (err) {
      console.error('removeTag error:', err);
      showTagMessage(containerEl, 'Network error. Please try again.', 'danger');
    }
  }

  // ─── Render Tag List ─────────────────────────────────────────────────────

  function renderTagList(imageId, tags, containerEl) {
    const tagListEl = document.getElementById('tag-list');
    if (!tagListEl) return;

    if (!tags || tags.length === 0) {
      tagListEl.innerHTML = '<span class="text-muted small">No tags yet.</span>';
      return;
    }

    tagListEl.innerHTML = tags.map(tag => `
      <span class="badge me-1 mb-1 d-inline-flex align-items-center tag-badge"
            style="background-color: ${tag.color || '#6c757d'}; font-size: 0.85rem; padding: 0.4em 0.6em;">
        <a href="/gallery?tag=${encodeURIComponent(tag.slug)}"
           class="text-white text-decoration-none me-1">${escapeHtml(tag.name)}</a>
        <button type="button"
                class="btn-close btn-close-white btn-sm ms-1"
                style="font-size: 0.6em;"
                aria-label="Remove tag"
                onclick="TaggingModule.removeTag(${imageId}, ${tag.id}, document.getElementById('tag-section'))">
        </button>
      </span>
    `).join('');
  }

  // ─── Show Message ─────────────────────────────────────────────────────────

  function showTagMessage(containerEl, message, type) {
    const msgEl = document.getElementById('tag-message');
    if (!msgEl) return;

    msgEl.className = `alert alert-${type} py-1 px-2 mt-2 small`;
    msgEl.textContent = message;
    msgEl.style.display = 'block';

    setTimeout(() => {
      msgEl.style.display = 'none';
    }, 3000);
  }

  // ─── Escape HTML ──────────────────────────────────────────────────────────

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  // ─── Tag Management Page: Inline Rename ───────────────────────────────────

  function initTagManagementPage() {
    const tableBody = document.getElementById('tagsTableBody');
    if (!tableBody) return;

    // Create tag form
    const createForm = document.getElementById('createTagForm');
    if (createForm) {
      createForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        const name = document.getElementById('newTagName').value.trim();
        const color = document.getElementById('newTagColor').value;
        const msgEl = document.getElementById('createTagMessage');

        try {
          const res = await fetch('/api/tags', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, color })
          });
          const data = await res.json();

          if (!res.ok) {
            msgEl.className = 'alert alert-danger';
            msgEl.textContent = data.error || 'Failed to create tag.';
            msgEl.style.display = 'block';
            return;
          }

          msgEl.className = 'alert alert-success';
          msgEl.textContent = `Tag "${data.name}" created successfully!`;
          msgEl.style.display = 'block';

          // Add new row to table
          addTagRow(data);
          updateTagCount(1);

          createForm.reset();
          document.getElementById('newTagColor').value = '#6c757d';

          setTimeout(() => { msgEl.style.display = 'none'; }, 3000);
        } catch (err) {
          console.error('Create tag error:', err);
          msgEl.className = 'alert alert-danger';
          msgEl.textContent = 'Network error. Please try again.';
          msgEl.style.display = 'block';
        }
      });
    }

    // Delegate events for rename/delete/save/cancel
    tableBody.addEventListener('click', async function (e) {
      const renameBtn = e.target.closest('.btn-rename');
      const deleteBtn = e.target.closest('.btn-delete');
      const saveBtn = e.target.closest('.btn-save');
      const cancelBtn = e.target.closest('.btn-cancel');

      if (renameBtn) {
        const tagId = renameBtn.dataset.tagId;
        enterEditMode(tagId);
      } else if (deleteBtn) {
        const tagId = deleteBtn.dataset.tagId;
        const tagName = deleteBtn.dataset.tagName;
        await handleDelete(tagId, tagName);
      } else if (saveBtn) {
        const tagId = saveBtn.dataset.tagId;
        await handleSave(tagId);
      } else if (cancelBtn) {
        const tagId = cancelBtn.dataset.tagId;
        exitEditMode(tagId);
      }
    });
  }

  function enterEditMode(tagId) {
    const nameDisplay = document.getElementById(`tag-name-${tagId}`);
    const nameInput = document.getElementById(`tag-input-${tagId}`);
    const actions = document.getElementById(`tag-actions-${tagId}`);
    const editActions = document.getElementById(`tag-edit-actions-${tagId}`);

    if (nameDisplay) nameDisplay.classList.add('d-none');
    if (nameInput) {
      nameInput.style.removeProperty('display');
      nameInput.classList.remove('d-none');
      nameInput.classList.add('d-block');
      nameInput.focus();
      nameInput.select();
    }
    if (actions) actions.classList.add('d-none');
    if (editActions) editActions.classList.remove('d-none');
  }

  function exitEditMode(tagId) {
    const nameDisplay = document.getElementById(`tag-name-${tagId}`);
    const nameInput = document.getElementById(`tag-input-${tagId}`);
    const actions = document.getElementById(`tag-actions-${tagId}`);
    const editActions = document.getElementById(`tag-edit-actions-${tagId}`);

    if (nameDisplay) nameDisplay.classList.remove('d-none');
    if (nameInput) {
      nameInput.classList.remove('d-block');
      nameInput.classList.add('d-none');
      // Reset to displayed value
      nameInput.value = nameDisplay ? nameDisplay.textContent : '';
    }
    if (actions) actions.classList.remove('d-none');
    if (editActions) editActions.classList.add('d-none');
  }

  async function handleSave(tagId) {
    const nameInput = document.getElementById(`tag-input-${tagId}`);
    const newName = nameInput ? nameInput.value.trim() : '';

    if (!newName || newName.length < 2 || newName.length > 30) {
      alert('Tag name must be between 2 and 30 characters.');
      return;
    }

    try {
      const res = await fetch(`/api/tags/${tagId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName })
      });
      const data = await res.json();

      if (!res.ok) {
        alert(data.error || 'Failed to rename tag.');
        return;
      }

      // Update display
      const nameDisplay = document.getElementById(`tag-name-${tagId}`);
      const slugDisplay = document.getElementById(`tag-slug-${tagId}`);
      if (nameDisplay) nameDisplay.textContent = data.name;
      if (slugDisplay) slugDisplay.textContent = data.slug;

      // Update the delete button's data-tag-name
      const deleteBtn = document.querySelector(`#tag-actions-${tagId} .btn-delete`);
      if (deleteBtn) deleteBtn.dataset.tagName = data.name;

      exitEditMode(tagId);
    } catch (err) {
      console.error('Save tag error:', err);
      alert('Network error. Please try again.');
    }
  }

  async function handleDelete(tagId, tagName) {
    const imageCount = document.querySelector(`#tag-row-${tagId} .badge`)?.textContent?.trim() || '0';
    const confirmMsg = parseInt(imageCount) > 0
      ? `Delete tag "${tagName}"? This will remove it from ${imageCount} image(s).`
      : `Delete tag "${tagName}"? This cannot be undone.`;

    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/tags/${tagId}`, { method: 'DELETE' });
      const data = await res.json();

      if (!res.ok) {
        alert(data.error || 'Failed to delete tag.');
        return;
      }

      const row = document.getElementById(`tag-row-${tagId}`);
      if (row) {
        row.style.transition = 'opacity 0.3s';
        row.style.opacity = '0';
        setTimeout(() => {
          row.remove();
          updateTagCount(-1);
        }, 300);
      }
    } catch (err) {
      console.error('Delete tag error:', err);
      alert('Network error. Please try again.');
    }
  }

  function addTagRow(tag) {
    const tableBody = document.getElementById('tagsTableBody');
    if (!tableBody) return;

    // If "no tags" message is shown, replace with table
    const noTagsMsg = document.querySelector('.tag-cloud + p, .text-center.text-muted.py-5');
    if (noTagsMsg) {
      location.reload();
      return;
    }

    const tr = document.createElement('tr');
    tr.id = `tag-row-${tag.id}`;
    tr.dataset.tagId = tag.id;
    tr.innerHTML = `
      <td>
        <span class="d-inline-block rounded" style="width:24px;height:24px;background:${tag.color || '#6c757d'};border:1px solid #dee2e6;"></span>
      </td>
      <td>
        <span class="tag-name-display" id="tag-name-${tag.id}">${escapeHtml(tag.name)}</span>
        <input type="text" class="form-control form-control-sm tag-name-input d-none"
          id="tag-input-${tag.id}" value="${escapeHtml(tag.name)}" minlength="2" maxlength="30"
          style="display:none!important;">
      </td>
      <td><code class="tag-slug-display" id="tag-slug-${tag.id}">${escapeHtml(tag.slug)}</code></td>
      <td class="text-center">
        <a href="/gallery?tag=${encodeURIComponent(tag.slug)}" class="badge bg-secondary text-decoration-none">0</a>
      </td>
      <td><small class="text-muted">${new Date(tag.createdAt).toLocaleDateString()}</small></td>
      <td class="text-center">
        <div class="btn-group btn-group-sm" id="tag-actions-${tag.id}">
          <button class="btn btn-outline-primary btn-rename" data-tag-id="${tag.id}" title="Rename">
            <i class="bi bi-pencil"></i>
          </button>
          <button class="btn btn-outline-danger btn-delete" data-tag-id="${tag.id}" data-tag-name="${escapeHtml(tag.name)}" title="Delete">
            <i class="bi bi-trash"></i>
          </button>
        </div>
        <div class="btn-group btn-group-sm d-none" id="tag-edit-actions-${tag.id}">
          <button class="btn btn-success btn-save" data-tag-id="${tag.id}" title="Save">
            <i class="bi bi-check-lg"></i> Save
          </button>
          <button class="btn btn-secondary btn-cancel" data-tag-id="${tag.id}" title="Cancel">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>
      </td>
    `;
    tableBody.insertBefore(tr, tableBody.firstChild);
  }

  function updateTagCount(delta) {
    const countEl = document.getElementById('tagCount');
    if (countEl) {
      const current = parseInt(countEl.textContent) || 0;
      countEl.textContent = Math.max(0, current + delta);
    }
  }

  // ─── Image Detail Page: Tag Input Form ───────────────────────────────────

  function initImageDetailTagging() {
    const tagForm = document.getElementById('tag-add-form');
    if (!tagForm) return;

    const imageId = tagForm.dataset.imageId;
    const tagInput = document.getElementById('tag-input');
    const tagDatalist = document.getElementById('tag-suggestions');
    const containerEl = document.getElementById('tag-section');

    setupTagAutocomplete(tagInput, tagDatalist);

    tagForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      const tagName = tagInput.value.trim();
      if (!tagName) return;
      await addTag(imageId, tagName, containerEl);
      tagInput.value = '';
    });
  }

  // ─── Init ─────────────────────────────────────────────────────────────────

  document.addEventListener('DOMContentLoaded', function () {
    initTagManagementPage();
    initImageDetailTagging();
  });

  // Expose for inline event handlers
  window.TaggingModule = { addTag, removeTag };

})();