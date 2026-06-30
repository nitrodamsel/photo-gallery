/**
 * tagging.js - Client-side tagging logic
 * Handles tag input autocomplete, adding/removing tags on image detail page,
 * and inline rename/delete on tag management page.
 */

// ─── Autocomplete ────────────────────────────────────────────────────────────

let autocompleteTimeout = null;

function initTagAutocomplete(inputEl, datalistEl) {
  if (!inputEl || !datalistEl) return;

  inputEl.addEventListener('input', function () {
    clearTimeout(autocompleteTimeout);
    const q = this.value.trim();
    if (q.length < 1) {
      datalistEl.innerHTML = '';
      return;
    }
    autocompleteTimeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/tags?q=${encodeURIComponent(q)}`);
        if (!res.ok) return;
        const tags = await res.json();
        datalistEl.innerHTML = tags
          .map(t => `<option value="${escapeHtml(t.name)}" data-id="${t.id}">`)
          .join('');
      } catch (e) {
        console.error('Autocomplete error:', e);
      }
    }, 200);
  });
}

// ─── Tag Badge Rendering ──────────────────────────────────────────────────────

function renderTagBadge(tag) {
  const color = tag.color || '#6c757d';
  return `<span class="badge me-1 mb-1 tag-badge d-inline-flex align-items-center"
    style="background-color:${color};font-size:0.85rem;"
    data-tag-id="${tag.id}">
    <a href="/gallery?tag=${escapeHtml(tag.slug)}"
       class="text-white text-decoration-none me-1">${escapeHtml(tag.name)}</a>
    <button type="button"
      class="btn-close btn-close-white btn-sm ms-1 tag-remove-btn"
      aria-label="Remove tag"
      style="font-size:0.6rem;filter:brightness(2);"
      onclick="removeTag(currentImageId, ${tag.id})">
    </button>
  </span>`;
}

function renderTagList(tags, container) {
  if (!container) return;
  const addBtn = container.querySelector('.tag-add-form');
  // Remove existing badges (not the add form)
  const existing = container.querySelectorAll('.tag-badge');
  existing.forEach(el => el.remove());

  const fragment = document.createDocumentFragment();
  tags.forEach(tag => {
    const span = document.createElement('span');
    span.innerHTML = renderTagBadge(tag);
    fragment.appendChild(span.firstChild);
  });

  // Insert before the add form if it exists, else append
  const addForm = container.querySelector('.tag-add-form');
  if (addForm) {
    container.insertBefore(fragment, addForm);
  } else {
    container.appendChild(fragment);
  }
}

// ─── Add/Remove Tags (Image Detail Page) ─────────────────────────────────────

let currentImageId = null;

function initImageTagging(imageId) {
  currentImageId = imageId;

  const form = document.getElementById('tagAddForm');
  const input = document.getElementById('tagInput');
  const datalist = document.getElementById('tagSuggestions');
  const alertEl = document.getElementById('tagAlert');

  if (datalist && input) {
    initTagAutocomplete(input, datalist);
  }

  if (form) {
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      const name = input ? input.value.trim() : '';
      if (!name) return;

      try {
        await addTag(imageId, name);
        if (input) input.value = '';
        showTagAlert(alertEl, 'success', `Tag "${name}" added.`);
      } catch (err) {
        showTagAlert(alertEl, 'danger', err.message || 'Failed to add tag.');
      }
    });
  }
}

async function addTag(imageId, name) {
  const res = await fetch(`/api/images/${imageId}/tags`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tagName: name })
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to add tag');
  }

  const container = document.getElementById('tagContainer');
  if (container && data.tags) {
    renderTagList(data.tags, container);
  }

  return data.tags;
}

async function removeTag(imageId, tagId) {
  try {
    const res = await fetch(`/api/images/${imageId}/tags/${tagId}`, {
      method: 'DELETE'
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to remove tag');
    }

    const container = document.getElementById('tagContainer');
    if (container && data.tags) {
      renderTagList(data.tags, container);
    }
  } catch (err) {
    console.error('Remove tag error:', err);
    alert(err.message || 'Failed to remove tag');
  }
}

function showTagAlert(el, type, message) {
  if (!el) return;
  el.className = `alert alert-${type} py-1 small`;
  el.textContent = message;
  el.classList.remove('d-none');
  setTimeout(() => {
    el.classList.add('d-none');
  }, 3000);
}

// ─── Tag Management Page ──────────────────────────────────────────────────────

function initTagManagement() {
  // Create tag form
  const createForm = document.getElementById('createTagForm');
  const colorPicker = document.getElementById('newTagColor');
  const colorHex = document.getElementById('newTagColorHex');
  const createAlert = document.getElementById('createTagAlert');

  // Sync color picker and hex input
  if (colorPicker && colorHex) {
    colorPicker.addEventListener('input', function () {
      colorHex.value = this.value;
    });
    colorHex.addEventListener('input', function () {
      if (/^#[0-9A-Fa-f]{6}$/.test(this.value)) {
        colorPicker.value = this.value;
      }
    });
  }

  if (createForm) {
    createForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      const name = document.getElementById('newTagName').value.trim();
      const color = colorPicker ? colorPicker.value : '#6c757d';

      try {
        const res = await fetch('/api/tags', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, color })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to create tag');

        showManagementAlert(createAlert, 'success', `Tag "${data.name}" created successfully!`);
        createForm.reset();
        if (colorPicker) colorPicker.value = '#6c757d';
        if (colorHex) colorHex.value = '#6c757d';

        // Add row to table
        appendTagRow(data);
      } catch (err) {
        showManagementAlert(createAlert, 'danger', err.message);
      }
    });
  }

  // Table-level delegation for edit/save/cancel/delete
  const tbody = document.getElementById('tagsTableBody');
  if (tbody) {
    tbody.addEventListener('click', handleTableClick);
  }

  // Search/filter
  const searchInput = document.getElementById('tagSearch');
  if (searchInput) {
    searchInput.addEventListener('input', function () {
      const q = this.value.toLowerCase();
      const rows = document.querySelectorAll('#tagsTableBody tr');
      rows.forEach(row => {
        const name = row.querySelector('.tag-name-display')?.textContent?.toLowerCase() || '';
        const slug = row.querySelector('.tag-slug-display')?.textContent?.toLowerCase() || '';
        row.style.display = (!q || name.includes(q) || slug.includes(q)) ? '' : 'none';
      });
    });
  }
}

async function handleTableClick(e) {
  const row = e.target.closest('tr');
  if (!row) return;
  const tagId = row.dataset.tagId;

  // Edit button
  if (e.target.closest('.tag-edit-btn')) {
    startEditRow(row);
  }

  // Cancel button
  else if (e.target.closest('.tag-cancel-btn')) {
    cancelEditRow(row);
  }

  // Save button
  else if (e.target.closest('.tag-save-btn')) {
    await saveTagRow(row, tagId);
  }

  // Delete button
  else if (e.target.closest('.tag-delete-btn')) {
    await deleteTagRow(row, tagId);
  }
}

function startEditRow(row) {
  row.querySelector('.tag-name-display').classList.add('d-none');
  row.querySelector('.tag-name-edit').classList.remove('d-none');
  row.querySelector('.tag-action-btns').classList.add('d-none');
  const input = row.querySelector('.tag-rename-input');
  if (input) {
    input.focus();
    input.select();
  }
}

function cancelEditRow(row) {
  const input = row.querySelector('.tag-rename-input');
  if (input) input.value = input.dataset.original;
  row.querySelector('.tag-name-display').classList.remove('d-none');
  row.querySelector('.tag-name-edit').classList.add('d-none');
  row.querySelector('.tag-action-btns').classList.remove('d-none');
}

async function saveTagRow(row, tagId) {
  const input = row.querySelector('.tag-rename-input');
  const colorInput = row.querySelector('.tag-color-input');
  const name = input ? input.value.trim() : '';
  const color = colorInput ? colorInput.value : '#6c757d';

  if (!name) {
    input && input.classList.add('is-invalid');
    return;
  }

  try {
    const res = await fetch(`/api/tags/${tagId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, color })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to rename tag');

    // Update display
    const badgeEl = row.querySelector('.tag-name-display .badge');
    if (badgeEl) {
      badgeEl.textContent = data.name;
      badgeEl.style.backgroundColor = data.color;
    }
    const slugEl = row.querySelector('.tag-slug-display');
    if (slugEl) slugEl.textContent = data.slug;

    const swatch = row.querySelector('.tag-color-swatch');
    if (swatch) swatch.style.background = data.color;

    // Update original value
    if (input) input.dataset.original = data.name;
    row.dataset.tagSlug = data.slug;

    cancelEditRow(row);
  } catch (err) {
    alert(err.message || 'Failed to rename tag');
  }
}

async function deleteTagRow(row, tagId) {
  const tagName = row.querySelector('.tag-name-display .badge')?.textContent || 'this tag';
  const count = parseInt(row.querySelector('.tag-count')?.textContent || '0', 10);
  const msg = count > 0
    ? `Delete tag "${tagName}"? This will remove it from ${count} image(s).`
    : `Delete tag "${tagName}"?`;

  if (!confirm(msg)) return;

  try {
    const res = await fetch(`/api/tags/${tagId}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to delete tag');

    row.remove();

    // Update count badge in header
    const headerBadge = document.querySelector('.h2 + .badge, h1 + .badge');
    if (headerBadge) {
      const current = parseInt(headerBadge.textContent, 10);
      headerBadge.textContent = `${Math.max(0, current - 1)} tags`;
    }
  } catch (err) {
    alert(err.message || 'Failed to delete tag');
  }
}

function appendTagRow(tag) {
  const tbody = document.getElementById('tagsTableBody');
  if (!tbody) return;

  const color = tag.color || '#6c757d';
  const date = new Date(tag.createdAt).toLocaleDateString();

  const tr = document.createElement('tr');
  tr.dataset.tagId = tag.id;
  tr.dataset.tagSlug = tag.slug;
  tr.innerHTML = `
    <td>
      <span class="tag-color-swatch d-inline-block rounded"
        style="width:24px;height:24px;background:${color};border:1px solid rgba(0,0,0,.15);"
        title="${color}"></span>
    </td>
    <td>
      <span class="tag-name-display">
        <span class="badge" style="background-color:${color};font-size:0.85rem;">${escapeHtml(tag.name)}</span>
      </span>
      <span class="tag-name-edit d-none">
        <div class="input-group input-group-sm" style="max-width:250px;">
          <input type="text" class="form-control tag-rename-input" value="${escapeHtml(tag.name)}"
            minlength="2" maxlength="30" data-original="${escapeHtml(tag.name)}">
          <input type="color" class="form-control form-control-color tag-color-input p-0 border-start-0"
            value="${color}" style="width:2.5rem;" title="Color">
          <button class="btn btn-success btn-sm tag-save-btn" type="button">
            <i class="bi bi-check-lg"></i>
          </button>
          <button class="btn btn-outline-secondary btn-sm tag-cancel-btn" type="button">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>
      </span>
    </td>
    <td><code class="tag-slug-display small">${escapeHtml(tag.slug)}</code></td>
    <td class="text-center">
      <a href="/gallery?tag=${escapeHtml(tag.slug)}" class="badge bg-light text-dark text-decoration-none tag-count" title="View images with this tag">0</a>
    </td>
    <td class="text-muted small">${date}</td>
    <td>
      <div class="btn-group btn-group-sm tag-action-btns">
        <button class="btn btn-outline-primary tag-edit-btn" title="Rename tag">
          <i class="bi bi-pencil"></i> Edit
        </button>
        <button class="btn btn-outline-danger tag-delete-btn" title="Delete tag">
          <i class="bi bi-trash"></i>
        </button>
      </div>
    </td>
  `;
  tbody.insertAdjacentElement('afterbegin', tr);

  // Update header count
  const headerBadge = document.querySelector('.badge.bg-secondary.fs-6');
  if (headerBadge) {
    const current = parseInt(headerBadge.textContent, 10) || 0;
    headerBadge.textContent = `${current + 1} tags`;
  }
}

function showManagementAlert(el, type, message) {
  if (!el) return;
  el.className = `alert alert-${type}`;
  el.textContent = message;
  el.classList.remove('d-none');
  setTimeout(() => el.classList.add('d-none'), 4000);
}

// ─── Utility ──────────────────────────────────────────────────────────────────

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}