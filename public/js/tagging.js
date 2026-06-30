/**
 * tagging.js — Client-side tagging logic
 * - Tag input autocomplete using datalist and fetch
 * - addTag(imageId, name): POST to API, re-renders tag list in DOM
 * - removeTag(imageId, tagId): DELETE, removes badge from DOM
 * - Inline rename handler for tag management page
 */

/* ─────────────────────────────────────────────
   Autocomplete helpers
───────────────────────────────────────────── */

let autocompleteDebounceTimer = null;

function initTagAutocomplete(inputEl, datalistEl) {
  if (!inputEl || !datalistEl) return;

  inputEl.addEventListener('input', function () {
    clearTimeout(autocompleteDebounceTimer);
    const q = this.value.trim();
    if (q.length < 1) {
      datalistEl.innerHTML = '';
      return;
    }
    autocompleteDebounceTimer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/tags?q=${encodeURIComponent(q)}`);
        if (!res.ok) return;
        const tags = await res.json();
        datalistEl.innerHTML = tags
          .map(t => `<option value="${escapeHtml(t.name)}">`)
          .join('');
      } catch (e) {
        console.warn('Autocomplete fetch failed:', e);
      }
    }, 200);
  });
}

/* ─────────────────────────────────────────────
   Image detail page — tag assignment
───────────────────────────────────────────── */

async function addTag(imageId, tagName) {
  if (!tagName || tagName.trim().length === 0) return;

  try {
    const res = await fetch(`/api/images/${imageId}/tags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tagName: tagName.trim() })
    });

    const data = await res.json();

    if (!res.ok) {
      showInlineAlert('danger', data.error || 'Failed to add tag');
      return;
    }

    renderTagList(imageId, data.tags);
    // Clear input
    const input = document.getElementById('tagInput');
    if (input) input.value = '';
  } catch (err) {
    showInlineAlert('danger', 'Network error while adding tag');
    console.error(err);
  }
}

async function removeTag(imageId, tagId) {
  try {
    const res = await fetch(`/api/images/${imageId}/tags/${tagId}`, {
      method: 'DELETE'
    });

    const data = await res.json();

    if (!res.ok) {
      showInlineAlert('danger', data.error || 'Failed to remove tag');
      return;
    }

    renderTagList(imageId, data.tags);
  } catch (err) {
    showInlineAlert('danger', 'Network error while removing tag');
    console.error(err);
  }
}

function renderTagList(imageId, tags) {
  const container = document.getElementById('tagList');
  if (!container) return;

  if (tags.length === 0) {
    container.innerHTML = '<span class="text-muted fst-italic small">No tags yet</span>';
    return;
  }

  container.innerHTML = tags.map(tag => `
    <span class="badge me-1 mb-1 tag-badge d-inline-flex align-items-center gap-1"
          style="background-color: ${escapeHtml(tag.color || '#6c757d')}; font-size: 0.85rem; padding: 0.4em 0.65em;">
      <a href="/gallery?tag=${escapeHtml(tag.slug)}" class="text-white text-decoration-none">
        ${escapeHtml(tag.name)}
      </a>
      <button
        type="button"
        class="btn-close btn-close-white btn-sm"
        style="font-size: 0.6em;"
        aria-label="Remove tag"
        onclick="removeTag(${imageId}, ${tag.id})"
      ></button>
    </span>
  `).join('');
}

/* ─────────────────────────────────────────────
   Image detail page — init
───────────────────────────────────────────── */

function initImageTagging(imageId) {
  const form = document.getElementById('addTagForm');
  const input = document.getElementById('tagInput');
  const datalist = document.getElementById('tagSuggestions');

  initTagAutocomplete(input, datalist);

  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (input && input.value.trim()) {
        addTag(imageId, input.value.trim());
      }
    });
  }
}

/* ─────────────────────────────────────────────
   Tag management page
───────────────────────────────────────────── */

function initTagManagementPage() {
  const tableBody = document.getElementById('tagsTableBody');
  const createForm = document.getElementById('createTagForm');
  const searchInput = document.getElementById('tagSearch');

  // Create tag
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
          showPageAlert('danger', data.error || 'Failed to create tag');
          return;
        }
        // Add new row to table
        appendTagRow(data);
        nameInput.value = '';
        colorInput.value = '#6c757d';
        updateTagCount(1);
        removeEmptyRow();
        showPageAlert('success', `Tag "${data.name}" created successfully`);
      } catch (err) {
        showPageAlert('danger', 'Network error while creating tag');
        console.error(err);
      }
    });
  }

  // Delegate events on table body
  if (tableBody) {
    tableBody.addEventListener('click', function (e) {
      const row = e.target.closest('tr[data-tag-id]');
      if (!row) return;
      const tagId = row.dataset.tagId;

      // Rename button
      if (e.target.closest('.rename-tag-btn')) {
        toggleEditMode(row, true);
        return;
      }

      // Cancel edit
      if (e.target.closest('.cancel-edit-btn')) {
        toggleEditMode(row, false);
        return;
      }

      // Save rename
      if (e.target.closest('.save-tag-btn')) {
        saveTagRename(row, tagId);
        return;
      }

      // Delete tag
      if (e.target.closest('.delete-tag-btn')) {
        const tagName = row.querySelector('.tag-name-display').textContent;
        const count = parseInt(row.querySelector('.tag-image-count').textContent) || 0;
        const countMsg = count > 0 ? ` This will remove it from ${count} image(s).` : '';
        if (confirm(`Delete tag "${tagName}"?${countMsg}`)) {
          deleteTag(row, tagId);
        }
        return;
      }
    });

    // Allow pressing Enter to save in rename input
    tableBody.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        const input = e.target.closest('.tag-name-input');
        if (input) {
          const row = e.target.closest('tr[data-tag-id]');
          if (row) saveTagRename(row, row.dataset.tagId);
        }
      }
      if (e.key === 'Escape') {
        const row = e.target.closest('tr[data-tag-id]');
        if (row) toggleEditMode(row, false);
      }
    });
  }

  // Filter / search
  if (searchInput) {
    searchInput.addEventListener('input', function () {
      const q = this.value.toLowerCase();
      const rows = document.querySelectorAll('#tagsTableBody tr[data-tag-id]');
      rows.forEach(row => {
        const name = row.dataset.tagName || '';
        row.style.display = name.includes(q) ? '' : 'none';
      });
    });
  }
}

function toggleEditMode(row, editing) {
  const displayEl = row.querySelector('.tag-name-display');
  const editGroup = row.querySelector('.tag-edit-group');
  const renameBtn = row.querySelector('.rename-tag-btn');
  const deleteBtn = row.querySelector('.delete-tag-btn');

  if (editing) {
    displayEl.classList.add('d-none');
    editGroup.classList.remove('d-none');
    if (renameBtn) renameBtn.classList.add('d-none');
    if (deleteBtn) deleteBtn.classList.add('d-none');
    editGroup.querySelector('.tag-name-input').focus();
  } else {
    displayEl.classList.remove('d-none');
    editGroup.classList.add('d-none');
    if (renameBtn) renameBtn.classList.remove('d-none');
    if (deleteBtn) deleteBtn.classList.remove('d-none');
  }
}

async function saveTagRename(row, tagId) {
  const nameInput = row.querySelector('.tag-name-input');
  const colorInput = row.querySelector('.tag-color-input');
  const name = nameInput.value.trim();
  const color = colorInput ? colorInput.value : undefined;

  if (!name) {
    nameInput.classList.add('is-invalid');
    return;
  }
  nameInput.classList.remove('is-invalid');

  try {
    const body = { name };
    if (color) body.color = color;

    const res = await fetch(`/api/tags/${tagId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();

    if (!res.ok) {
      showPageAlert('danger', data.error || 'Failed to rename tag');
      return;
    }

    // Update row display
    row.querySelector('.tag-name-display').textContent = data.name;
    row.querySelector('.tag-slug').textContent = data.slug;
    row.dataset.tagName = data.name.toLowerCase();

    const swatch = row.querySelector('.tag-color-swatch');
    if (swatch && data.color) {
      swatch.style.background = data.color;
      swatch.title = data.color;
    }

    // Reset input values for next time
    nameInput.value = data.name;

    toggleEditMode(row, false);
    showPageAlert('success', `Tag renamed to "${data.name}"`);
  } catch (err) {
    showPageAlert('danger', 'Network error while renaming tag');
    console.error(err);
  }
}

async function deleteTag(row, tagId) {
  try {
    const res = await fetch(`/api/tags/${tagId}`, { method: 'DELETE' });
    const data = await res.json();

    if (!res.ok) {
      showPageAlert('danger', data.error || 'Failed to delete tag');
      return;
    }

    const tagName = row.querySelector('.tag-name-display').textContent;
    row.remove();
    updateTagCount(-1);

    const remaining = document.querySelectorAll('#tagsTableBody tr[data-tag-id]').length;
    if (remaining === 0) {
      showEmptyRow();
    }

    showPageAlert('success', `Tag "${tagName}" deleted`);
  } catch (err) {
    showPageAlert('danger', 'Network error while deleting tag');
    console.error(err);
  }
}

function appendTagRow(tag) {
  const tbody = document.getElementById('tagsTableBody');
  if (!tbody) return;

  const tr = document.createElement('tr');
  tr.dataset.tagId = tag.id;
  tr.dataset.tagName = tag.name.toLowerCase();

  const createdDate = new Date(tag.createdAt).toLocaleDateString();

  tr.innerHTML = `
    <td>
      <span
        class="tag-color-swatch"
        style="display:inline-block;width:24px;height:24px;border-radius:4px;background:${escapeHtml(tag.color)};"
        title="${escapeHtml(tag.color)}"
      ></span>
    </td>
    <td>
      <span class="tag-name-display fw-semibold">${escapeHtml(tag.name)}</span>
      <div class="tag-edit-group d-none input-group input-group-sm" style="max-width: 300px;">
        <input type="text" class="form-control tag-name-input" value="${escapeHtml(tag.name)}" maxlength="30">
        <input type="color" class="form-control form-control-color tag-color-input" value="${escapeHtml(tag.color)}" style="max-width:50px;">
        <button class="btn btn-success btn-sm save-tag-btn" title="Save">
          <i class="bi bi-check-lg"></i>
        </button>
        <button class="btn btn-outline-secondary btn-sm cancel-edit-btn" title="Cancel">
          <i class="bi bi-x-lg"></i>
        </button>
      </div>
    </td>
    <td><code class="tag-slug text-muted">${escapeHtml(tag.slug)}</code></td>
    <td class="text-center">
      <a href="/gallery?tag=${escapeHtml(tag.slug)}" class="badge rounded-pill bg-primary text-decoration-none tag-image-count">0</a>
    </td>
    <td class="text-muted small">${escapeHtml(createdDate)}</td>
    <td class="text-end">
      <button class="btn btn-sm btn-outline-secondary rename-tag-btn me-1" title="Rename tag">
        <i class="bi bi-pencil"></i>
      </button>
      <button class="btn btn-sm btn-outline-danger delete-tag-btn" title="Delete tag">
        <i class="bi bi-trash"></i>
      </button>
    </td>
  `;

  tbody.appendChild(tr);
}

function updateTagCount(delta) {
  const countEl = document.getElementById('tagCount');
  if (!countEl) return;
  const current = parseInt(countEl.textContent) || 0;
  countEl.textContent = Math.max(0, current + delta);
}

function removeEmptyRow() {
  const emptyRow = document.getElementById('emptyRow');
  if (emptyRow) emptyRow.remove();
}

function showEmptyRow() {
  const tbody = document.getElementById('tagsTableBody');
  if (!tbody) return;
  const tr = document.createElement('tr');
  tr.id = 'emptyRow';
  tr.innerHTML = `
    <td colspan="6" class="text-center text-muted py-5">
      <i class="bi bi-tags fs-1 d-block mb-2 opacity-25"></i>
      No tags yet. Create your first tag above!
    </td>
  `;
  tbody.appendChild(tr);
}

/* ─────────────────────────────────────────────
   Alert helpers
───────────────────────────────────────────── */

function showPageAlert(type, message) {
  const container = document.getElementById('alertContainer');
  if (!container) return;
  const id = 'alert-' + Date.now();
  const div = document.createElement('div');
  div.id = id;
  div.className = `alert alert-${type} alert-dismissible fade show`;
  div.setAttribute('role', 'alert');
  div.innerHTML = `
    ${escapeHtml(message)}
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
  `;
  container.appendChild(div);
  setTimeout(() => {
    const el = document.getElementById(id);
    if (el) el.remove();
  }, 4000);
}

function showInlineAlert(type, message) {
  const container = document.getElementById('tagAlertContainer');
  if (!container) return;
  container.innerHTML = `
    <div class="alert alert-${type} alert-dismissible fade show py-2" role="alert">
      ${escapeHtml(message)}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    </div>
  `;
  setTimeout(() => { container.innerHTML = ''; }, 4000);
}

/* ─────────────────────────────────────────────
   Utility
───────────────────────────────────────────── */

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}