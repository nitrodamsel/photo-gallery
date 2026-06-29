/**
 * Client-side tagging logic
 * Handles tag input autocomplete, adding/removing tags via API,
 * and inline rename functionality for the tag management page.
 */

(function () {
  'use strict';

  // ─── Tag Input & Autocomplete (Image Detail Page) ─────────────────────────

  const tagInput = document.getElementById('tagInput');
  const tagDatalist = document.getElementById('tagSuggestions');
  const addTagBtn = document.getElementById('addTagBtn');
  const tagList = document.getElementById('tagList');
  const imageId = document.getElementById('imageId') ? document.getElementById('imageId').value : null;

  let autocompleteTimeout = null;

  if (tagInput && tagDatalist) {
    tagInput.addEventListener('input', function () {
      clearTimeout(autocompleteTimeout);
      const q = this.value.trim();
      if (q.length < 1) {
        tagDatalist.innerHTML = '';
        return;
      }
      autocompleteTimeout = setTimeout(() => fetchTagSuggestions(q), 200);
    });

    tagInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAddTag();
      }
    });
  }

  if (addTagBtn) {
    addTagBtn.addEventListener('click', function () {
      handleAddTag();
    });
  }

  async function fetchTagSuggestions(q) {
    try {
      const res = await fetch(`/api/tags?q=${encodeURIComponent(q)}`);
      if (!res.ok) return;
      const tags = await res.json();
      tagDatalist.innerHTML = '';
      tags.forEach(tag => {
        const option = document.createElement('option');
        option.value = tag.name;
        tagDatalist.appendChild(option);
      });
    } catch (err) {
      console.error('Error fetching tag suggestions:', err);
    }
  }

  async function handleAddTag() {
    if (!tagInput || !imageId) return;
    const name = tagInput.value.trim();
    if (!name) return;

    tagInput.disabled = true;
    if (addTagBtn) addTagBtn.disabled = true;

    try {
      await addTag(imageId, name);
      tagInput.value = '';
      tagDatalist.innerHTML = '';
    } catch (err) {
      showTagError(err.message || 'Failed to add tag');
    } finally {
      tagInput.disabled = false;
      if (addTagBtn) addTagBtn.disabled = false;
      tagInput.focus();
    }
  }

  /**
   * Add a tag to an image via POST API
   */
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

    renderTagList(data.tags, imageId);
    return data.tags;
  }

  /**
   * Remove a tag from an image via DELETE API
   */
  async function removeTag(imageId, tagId) {
    const res = await fetch(`/api/images/${imageId}/tags/${tagId}`, {
      method: 'DELETE'
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Failed to remove tag');
    }

    renderTagList(data.tags, imageId);
    return data.tags;
  }

  /**
   * Re-render the tag list in the DOM
   */
  function renderTagList(tags, imageId) {
    if (!tagList) return;

    tagList.innerHTML = '';

    if (tags.length === 0) {
      tagList.innerHTML = '<span class="text-muted small">No tags yet. Add one below!</span>';
      return;
    }

    tags.forEach(tag => {
      const badge = document.createElement('span');
      badge.className = 'badge me-1 mb-1 tag-badge';
      badge.style.backgroundColor = tag.color || '#6c757d';
      badge.style.fontSize = '0.9rem';
      badge.style.cursor = 'default';
      badge.dataset.tagId = tag.id;
      badge.innerHTML = `
        ${escapeHtml(tag.name)}
        <button type="button" class="btn-close btn-close-white btn-sm ms-1 remove-tag-btn"
                aria-label="Remove tag"
                data-tag-id="${tag.id}"
                data-image-id="${imageId}"
                style="font-size: 0.6rem; vertical-align: middle;">
        </button>
      `;

      badge.querySelector('.remove-tag-btn').addEventListener('click', function () {
        const tId = this.dataset.tagId;
        const iId = this.dataset.imageId;
        removeTag(iId, tId).catch(err => showTagError(err.message));
      });

      tagList.appendChild(badge);
    });
  }

  function showTagError(message) {
    const errorEl = document.getElementById('tagError');
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.classList.remove('d-none');
      setTimeout(() => errorEl.classList.add('d-none'), 4000);
    } else {
      console.error('Tag error:', message);
    }
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  // Attach remove handlers to existing tags on page load
  document.querySelectorAll('.remove-tag-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      const tId = this.dataset.tagId;
      const iId = this.dataset.imageId;
      removeTag(iId, tId).catch(err => showTagError(err.message));
    });
  });

  // ─── Tag Management Page Logic ────────────────────────────────────────────

  // Create tag form
  const createTagForm = document.getElementById('createTagForm');
  const createTagStatus = document.getElementById('createTagStatus');

  if (createTagForm) {
    createTagForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      const nameInput = document.getElementById('newTagName');
      const colorInput = document.getElementById('newTagColor');
      const name = nameInput.value.trim();
      const color = colorInput.value;

      if (!name) return;

      createTagStatus.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';

      try {
        const res = await fetch('/api/tags', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, color })
        });

        const data = await res.json();

        if (!res.ok) {
          createTagStatus.innerHTML = `<span class="text-danger"><i class="bi bi-x-circle me-1"></i>${escapeHtml(data.error)}</span>`;
          return;
        }

        createTagStatus.innerHTML = '<span class="text-success"><i class="bi bi-check-circle me-1"></i>Created!</span>';
        nameInput.value = '';

        // Add new row to table
        addTagRowToTable(data);

        setTimeout(() => { createTagStatus.innerHTML = ''; }, 3000);
      } catch (err) {
        createTagStatus.innerHTML = `<span class="text-danger">Error: ${escapeHtml(err.message)}</span>`;
      }
    });
  }

  // Edit tag buttons
  document.addEventListener('click', async function (e) {
    // Edit button
    if (e.target.closest('.btn-edit-tag')) {
      const btn = e.target.closest('.btn-edit-tag');
      const row = document.getElementById(`tag-row-${btn.dataset.tagId}`);
      if (!row) return;
      row.querySelector('.tag-name-display').classList.add('d-none');
      row.querySelector('.tag-edit-form').classList.remove('d-none');
      row.querySelector('.tag-name-input').focus();
      btn.classList.add('d-none');
    }

    // Cancel edit button
    if (e.target.closest('.btn-cancel-edit')) {
      const btn = e.target.closest('.btn-cancel-edit');
      const row = btn.closest('tr');
      if (!row) return;
      row.querySelector('.tag-name-display').classList.remove('d-none');
      row.querySelector('.tag-edit-form').classList.add('d-none');
      row.querySelector('.btn-edit-tag').classList.remove('d-none');
    }

    // Save tag button
    if (e.target.closest('.btn-save-tag')) {
      const btn = e.target.closest('.btn-save-tag');
      const tagId = btn.dataset.tagId;
      const row = document.getElementById(`tag-row-${tagId}`);
      if (!row) return;

      const nameInput = row.querySelector('.tag-name-input');
      const colorInput = row.querySelector('.tag-color-input');
      const name = nameInput.value.trim();
      const color = colorInput.value;

      if (!name) return;

      btn.disabled = true;
      btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';

      try {
        const res = await fetch(`/api/tags/${tagId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, color })
        });

        const data = await res.json();

        if (!res.ok) {
          alert(data.error || 'Failed to update tag');
          return;
        }

        // Update the display
        const badgeEl = row.querySelector('.tag-name-display .badge');
        if (badgeEl) {
          badgeEl.textContent = data.name;
          badgeEl.style.backgroundColor = data.color || '#6c757d';
        }

        const slugEl = row.querySelector('.tag-slug-display');
        if (slugEl) slugEl.textContent = data.slug;

        const swatchEl = row.querySelector('.color-swatch');
        if (swatchEl) swatchEl.style.backgroundColor = data.color || '#6c757d';

        // Update color input value for next edit
        colorInput.value = data.color || '#6c757d';

        // Update delete button data attributes
        const deleteBtn = row.querySelector('.btn-delete-tag');
        if (deleteBtn) deleteBtn.dataset.tagName = data.name;

        // Hide edit form
        row.querySelector('.tag-name-display').classList.remove('d-none');
        row.querySelector('.tag-edit-form').classList.add('d-none');
        row.querySelector('.btn-edit-tag').classList.remove('d-none');
      } catch (err) {
        alert('Error saving tag: ' + err.message);
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-check-lg"></i>';
      }
    }

    // Delete tag button
    if (e.target.closest('.btn-delete-tag')) {
      const btn = e.target.closest('.btn-delete-tag');
      const tagId = btn.dataset.tagId;
      const tagName = btn.dataset.tagName;
      const imageCount = parseInt(btn.dataset.imageCount, 10) || 0;

      const modal = document.getElementById('deleteTagModal');
      if (!modal) {
        // Fallback if no modal
        if (confirm(`Delete tag "${tagName}"? This cannot be undone.`)) {
          await performDeleteTag(tagId);
        }
        return;
      }

      document.getElementById('deleteTagName').textContent = `"${tagName}"`;
      const warningEl = document.getElementById('deleteTagWarning');
      if (imageCount > 0) {
        warningEl.classList.remove('d-none');
        document.getElementById('deleteTagCount').textContent = imageCount;
      } else {
        warningEl.classList.add('d-none');
      }

      // Store pending delete id
      modal.dataset.pendingTagId = tagId;

      const bsModal = new bootstrap.Modal(modal);
      bsModal.show();
    }
  });

  // Confirm delete
  const confirmDeleteBtn = document.getElementById('confirmDeleteTag');
  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener('click', async function () {
      const modal = document.getElementById('deleteTagModal');
      const tagId = modal ? modal.dataset.pendingTagId : null;
      if (!tagId) return;

      this.disabled = true;
      this.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Deleting...';

      try {
        await performDeleteTag(tagId);
        const bsModal = bootstrap.Modal.getInstance(modal);
        if (bsModal) bsModal.hide();
      } catch (err) {
        alert('Failed to delete tag: ' + err.message);
      } finally {
        this.disabled = false;
        this.innerHTML = '<i class="bi bi-trash me-1"></i>Delete Tag';
      }
    });
  }

  async function performDeleteTag(tagId) {
    const res = await fetch(`/api/tags/${tagId}`, {
      method: 'DELETE'
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to delete tag');
    }

    // Remove row from table
    const row = document.getElementById(`tag-row-${tagId}`);
    if (row) {
      row.style.transition = 'opacity 0.3s';
      row.style.opacity = '0';
      setTimeout(() => row.remove(), 300);
    }
  }

  function addTagRowToTable(tag) {
    const tbody = document.getElementById('tagsTableBody');
    if (!tbody) return;

    const tr = document.createElement('tr');
    tr.id = `tag-row-${tag.id}`;
    tr.dataset.tagId = tag.id;
    tr.innerHTML = `
      <td>
        <div class="color-swatch" 
             style="width: 24px; height: 24px; border-radius: 4px; background-color: ${tag.color || '#6c757d'}; border: 1px solid #dee2e6;"
             title="${tag.color || 'default'}"></div>
      </td>
      <td>
        <span class="tag-name-display">
          <span class="badge" style="background-color: ${tag.color || '#6c757d'}; font-size: 0.9rem;">${escapeHtml(tag.name)}</span>
        </span>
        <div class="tag-edit-form d-none">
          <div class="input-group input-group-sm">
            <input type="text" class="form-control tag-name-input" 
                   value="${escapeHtml(tag.name)}" minlength="2" maxlength="30">
            <input type="color" class="form-control form-control-color tag-color-input" 
                   value="${tag.color || '#6c757d'}" style="max-width: 50px;">
            <button class="btn btn-success btn-save-tag" type="button" data-tag-id="${tag.id}">
              <i class="bi bi-check-lg"></i>
            </button>
            <button class="btn btn-secondary btn-cancel-edit" type="button">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
        </div>
      </td>
      <td><code class="tag-slug-display">${escapeHtml(tag.slug)}</code></td>
      <td>
        <a href="/gallery?tag=${escapeHtml(tag.slug)}" class="badge bg-info text-dark text-decoration-none">
          0 images
        </a>
      </td>
      <td><small class="text-muted">${new Date(tag.createdAt).toLocaleDateString()}</small></td>
      <td>
        <button class="btn btn-sm btn-outline-primary btn-edit-tag me-1" 
                data-tag-id="${tag.id}" title="Edit tag">
          <i class="bi bi-pencil"></i>
        </button>
        <button class="btn btn-sm btn-outline-danger btn-delete-tag" 
                data-tag-id="${tag.id}" 
                data-tag-name="${escapeHtml(tag.name)}"
                data-image-count="0"
                title="Delete tag">
          <i class="bi bi-trash"></i>
        </button>
      </td>
    `;

    tr.style.opacity = '0';
    tbody.insertBefore(tr, tbody.firstChild);
    setTimeout(() => {
      tr.style.transition = 'opacity 0.3s';
      tr.style.opacity = '1';
    }, 10);
  }

  // Tag search filter
  const tagSearch = document.getElementById('tagSearch');
  if (tagSearch) {
    tagSearch.addEventListener('input', function () {
      const q = this.value.toLowerCase();
      document.querySelectorAll('#tagsTableBody tr').forEach(row => {
        const name = row.querySelector('.tag-name-display')
          ? row.querySelector('.tag-name-display').textContent.toLowerCase()
          : '';
        const slug = row.querySelector('.tag-slug-display')
          ? row.querySelector('.tag-slug-display').textContent.toLowerCase()
          : '';
        row.style.display = (name.includes(q) || slug.includes(q)) ? '' : 'none';
      });
    });
  }

  // Expose functions globally if needed
  window.addTag = addTag;
  window.removeTag = removeTag;
})();