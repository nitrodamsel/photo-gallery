/**
 * Client-side tagging logic for the photo gallery application.
 * Handles tag input autocomplete, adding/removing tags from image detail page,
 * and tag management page interactions.
 */

// ─── Tag Input Autocomplete ──────────────────────────────────────────────────

/**
 * Initialize autocomplete on a tag input field using a datalist element.
 * @param {HTMLInputElement} inputEl - The input element
 * @param {HTMLDataListElement} datalistEl - The datalist element
 */
function initTagAutocomplete(inputEl, datalistEl) {
  if (!inputEl || !datalistEl) return;

  let debounceTimer;

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
          .map(tag => `<option value="${escapeHtml(tag.name)}"></option>`)
          .join('');
      } catch (err) {
        console.error('Autocomplete error:', err);
      }
    }, 200);
  });
}

// ─── Image Detail Page: Add / Remove Tags ────────────────────────────────────

/**
 * Add a tag to an image via API and re-render the tag list.
 * @param {number|string} imageId
 * @param {string} tagName
 */
async function addTag(imageId, tagName) {
  if (!tagName || tagName.trim().length < 2) {
    showTagError('Tag name must be at least 2 characters.');
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
      showTagError(data.error || 'Failed to add tag.');
      return;
    }

    renderTagList(imageId, data.tags);
    clearTagInput();
    hideTagError();
  } catch (err) {
    console.error('addTag error:', err);
    showTagError('Network error. Please try again.');
  }
}

/**
 * Remove a tag from an image via API and update the DOM.
 * @param {number|string} imageId
 * @param {number|string} tagId
 */
async function removeTag(imageId, tagId) {
  try {
    const res = await fetch(`/api/images/${imageId}/tags/${tagId}`, {
      method: 'DELETE'
    });

    const data = await res.json();

    if (!res.ok) {
      showTagError(data.error || 'Failed to remove tag.');
      return;
    }

    renderTagList(imageId, data.tags);
    hideTagError();
  } catch (err) {
    console.error('removeTag error:', err);
    showTagError('Network error. Please try again.');
  }
}

/**
 * Re-render the tag badge list in the DOM.
 * @param {number|string} imageId
 * @param {Array} tags
 */
function renderTagList(imageId, tags) {
  const container = document.getElementById('tag-list-container');
  if (!container) return;

  if (!tags || tags.length === 0) {
    container.innerHTML = '<span class="text-muted fst-italic">No tags yet.</span>';
    return;
  }

  container.innerHTML = tags.map(tag => `
    <span class="badge me-1 mb-1 tag-badge d-inline-flex align-items-center"
          style="background-color:${tag.color || '#6c757d'}; font-size:0.9rem;">
      <a href="/gallery?tag=${encodeURIComponent(tag.name)}"
         class="text-white text-decoration-none me-1">
        ${escapeHtml(tag.name)}
      </a>
      <button
        type="button"
        class="btn-close btn-close-white ms-1"
        style="font-size:0.6rem;"
        aria-label="Remove tag"
        onclick="removeTag(${imageId}, ${tag.id})"
      ></button>
    </span>
  `).join('');
}

/**
 * Clear the tag input field.
 */
function clearTagInput() {
  const input = document.getElementById('tagInput');
  if (input) input.value = '';
}

/**
 * Show a tag error message.
 */
function showTagError(msg) {
  const el = document.getElementById('tagError');
  if (el) {
    el.textContent = msg;
    el.classList.remove('d-none');
  }
}

/**
 * Hide tag error message.
 */
function hideTagError() {
  const el = document.getElementById('tagError');
  if (el) el.classList.add('d-none');
}

// ─── Tag Management Page ─────────────────────────────────────────────────────

/**
 * Initialize all tag management page interactions.
 */
function initTagManagement() {
  // Create tag form
  const createForm = document.getElementById('createTagForm');
  if (createForm) {
    createForm.addEventListener('submit', handleCreateTag);
  }

  // Rename buttons
  document.querySelectorAll('.rename-btn').forEach(btn => {
    btn.addEventListener('click', handleRenameClick);
  });

  // Save buttons
  document.querySelectorAll('.save-btn').forEach(btn => {
    btn.addEventListener('click', handleSaveClick);
  });

  // Cancel buttons
  document.querySelectorAll('.cancel-btn').forEach(btn => {
    btn.addEventListener('click', handleCancelClick);
  });

  // Delete buttons
  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', handleDeleteClick);
  });

  // Search/filter
  const searchInput = document.getElementById('tagSearch');
  if (searchInput) {
    searchInput.addEventListener('input', function () {
      filterTagsTable(this.value.toLowerCase());
    });
  }
}

async function handleCreateTag(e) {
  e.preventDefault();
  const nameInput = document.getElementById('newTagName');
  const colorInput = document.getElementById('newTagColor');
  const errorEl = document.getElementById('createTagError');
  const successEl = document.getElementById('createTagSuccess');

  const name = nameInput.value.trim();
  const color = colorInput.value;

  errorEl.classList.add('d-none');
  successEl.classList.add('d-none');

  try {
    const res = await fetch('/api/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, color })
    });

    const data = await res.json();

    if (!res.ok) {
      errorEl.textContent = data.error || 'Failed to create tag.';
      errorEl.classList.remove('d-none');
      return;
    }

    successEl.textContent = `Tag "${data.name}" created successfully! Refreshing...`;
    successEl.classList.remove('d-none');
    nameInput.value = '';

    // Reload to show new tag in table
    setTimeout(() => window.location.reload(), 1000);
  } catch (err) {
    console.error('createTag error:', err);
    errorEl.textContent = 'Network error. Please try again.';
    errorEl.classList.remove('d-none');
  }
}

function handleRenameClick(e) {
  const id = this.dataset.id;
  const row = document.getElementById(`tag-row-${id}`);
  if (!row) return;

  row.querySelector('.tag-name-display').classList.add('d-none');
  row.querySelector('.tag-name-edit').classList.remove('d-none');
  row.querySelector('.rename-btn').classList.add('d-none');
  row.querySelector('.delete-btn').classList.add('d-none');
  row.querySelector('.save-btn').classList.remove('d-none');
  row.querySelector('.cancel-btn').classList.remove('d-none');
  row.querySelector('.tag-name-edit').focus();
}

function handleCancelClick(e) {
  const id = this.dataset.id;
  const row = document.getElementById(`tag-row-${id}`);
  if (!row) return;

  const nameDisplay = row.querySelector('.tag-name-display');
  const nameEdit = row.querySelector('.tag-name-edit');
  nameEdit.value = nameDisplay.textContent.trim();

  row.querySelector('.tag-name-display').classList.remove('d-none');
  row.querySelector('.tag-name-edit').classList.add('d-none');
  row.querySelector('.rename-btn').classList.remove('d-none');
  row.querySelector('.delete-btn').classList.remove('d-none');
  row.querySelector('.save-btn').classList.add('d-none');
  row.querySelector('.cancel-btn').classList.add('d-none');
  row.querySelector('.tag-error').textContent = '';
}

async function handleSaveClick(e) {
  const id = this.dataset.id;
  const row = document.getElementById(`tag-row-${id}`);
  if (!row) return;

  const newName = row.querySelector('.tag-name-edit').value.trim();
  const errorEl = row.querySelector('.tag-error');
  errorEl.textContent = '';

  if (newName.length < 2 || newName.length > 30) {
    errorEl.textContent = 'Tag name must be 2–30 characters.';
    return;
  }
  if (!/^[a-zA-Z0-9\- ]+$/.test(newName)) {
    errorEl.textContent = 'Only letters, numbers, hyphens, spaces allowed.';
    return;
  }

  try {
    const res = await fetch(`/api/tags/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName })
    });

    const data = await res.json();

    if (!res.ok) {
      errorEl.textContent = data.error || 'Failed to rename tag.';
      return;
    }

    // Update display
    row.querySelector('.tag-name-display').textContent = data.name;
    row.querySelector('.tag-name-edit').value = data.name;
    row.querySelector('.tag-slug-display').textContent = data.slug || '';

    row.querySelector('.tag-name-display').classList.remove('d-none');
    row.querySelector('.tag-name-edit').classList.add('d-none');
    row.querySelector('.rename-btn').classList.remove('d-none');
    row.querySelector('.delete-btn').classList.remove('d-none');
    row.querySelector('.save-btn').classList.add('d-none');
    row.querySelector('.cancel-btn').classList.add('d-none');
  } catch (err) {
    console.error('renameTag error:', err);
    errorEl.textContent = 'Network error. Please try again.';
  }
}

async function handleDeleteClick(e) {
  const id = this.dataset.id;
  const name = this.dataset.name;

  if (!confirm(`Delete tag "${name}"? This will remove it from all images.`)) {
    return;
  }

  try {
    const res = await fetch(`/api/tags/${id}`, {
      method: 'DELETE'
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || 'Failed to delete tag.');
      return;
    }

    // Remove row from table
    const row = document.getElementById(`tag-row-${id}`);
    if (row) {
      row.style.transition = 'opacity 0.3s';
      row.style.opacity = '0';
      setTimeout(() => row.remove(), 300);
    }
  } catch (err) {
    console.error('deleteTag error:', err);
    alert('Network error. Please try again.');
  }
}

function filterTagsTable(query) {
  const rows = document.querySelectorAll('#tagsTableBody tr');
  rows.forEach(row => {
    const name = row.querySelector('.tag-name-display');
    const slug = row.querySelector('.tag-slug-display');
    const nameText = name ? name.textContent.toLowerCase() : '';
    const slugText = slug ? slug.textContent.toLowerCase() : '';
    if (nameText.includes(query) || slugText.includes(query)) {
      row.style.display = '';
    } else {
      row.style.display = 'none';
    }
  });
}

// ─── Image Detail Page Initialization ───────────────────────────────────────

/**
 * Initialize tagging UI on the image detail page.
 * @param {number|string} imageId
 */
function initImageTagging(imageId) {
  const tagInput = document.getElementById('tagInput');
  const tagDatalist = document.getElementById('tagSuggestions');
  const addTagBtn = document.getElementById('addTagBtn');
  const tagForm = document.getElementById('tagForm');

  // Autocomplete
  initTagAutocomplete(tagInput, tagDatalist);

  // Form submit
  if (tagForm) {
    tagForm.addEventListener('submit', function (e) {
      e.preventDefault();
      const name = tagInput ? tagInput.value.trim() : '';
      if (name) addTag(imageId, name);
    });
  }

  // Add button click
  if (addTagBtn) {
    addTagBtn.addEventListener('click', function () {
      const name = tagInput ? tagInput.value.trim() : '';
      if (name) addTag(imageId, name);
    });
  }
}

// ─── Utility ─────────────────────────────────────────────────────────────────

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}