/* ============================================================
   Gallery — Main JS
   ============================================================ */

document.addEventListener('DOMContentLoaded', function () {

  // -----------------------------------------------------------
  // Lightbox
  // -----------------------------------------------------------
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightbox-img');
  const lightboxClose = document.getElementById('lightbox-close');
  const lightboxTriggers = document.querySelectorAll('.lightbox-trigger');

  function openLightbox(src, alt) {
    if (!lightbox || !lightboxImg) return;
    lightboxImg.src = src;
    if (alt) lightboxImg.alt = alt;
    lightbox.hidden = false;
    lightbox.focus();
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    if (!lightbox) return;
    lightbox.hidden = true;
    lightboxImg.src = '';
    document.body.style.overflow = '';
  }

  lightboxTriggers.forEach(function (trigger) {
    trigger.addEventListener('click', function () {
      const src = trigger.getAttribute('data-src') || '';
      const img = trigger.querySelector('img');
      const alt = img ? img.getAttribute('alt') : '';
      openLightbox(src, alt);
    });
    // Keyboard support
    trigger.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        trigger.click();
      }
    });
  });

  if (lightboxClose) {
    lightboxClose.addEventListener('click', closeLightbox);
  }

  if (lightbox) {
    lightbox.addEventListener('click', function (e) {
      if (e.target === lightbox) closeLightbox();
    });
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && lightbox && !lightbox.hidden) {
      closeLightbox();
    }
  });

  // -----------------------------------------------------------
  // EXIF Accordion
  // -----------------------------------------------------------
  const accordionToggles = document.querySelectorAll('.accordion-toggle');

  accordionToggles.forEach(function (toggle) {
    toggle.addEventListener('click', function () {
      const expanded = toggle.getAttribute('aria-expanded') === 'true';
      const panelId = toggle.getAttribute('aria-controls');
      const panel = panelId ? document.getElementById(panelId) : null;

      toggle.setAttribute('aria-expanded', String(!expanded));

      if (panel) {
        if (expanded) {
          panel.classList.add('collapsed');
        } else {
          panel.classList.remove('collapsed');
        }
      }
    });
  });

  // -----------------------------------------------------------
  // Tag remove buttons (client-side UX scaffold)
  // -----------------------------------------------------------
  const tagRemoveBtns = document.querySelectorAll('.tag-remove-btn');

  tagRemoveBtns.forEach(function (btn) {
    btn.addEventListener('click', async function () {
      const imageId = btn.getAttribute('data-image-id');
      const tagId = btn.getAttribute('data-tag-id');

      if (!imageId || !tagId) return;

      if (!confirm('Remove this tag?')) return;

      try {
        const res = await fetch(`/api/images/${imageId}/tags/${tagId}`, {
          method: 'DELETE',
          headers: { 'Accept': 'application/json' },
        });

        if (res.ok) {
          const badge = btn.closest('.tag-badge');
          if (badge) {
            badge.remove();
          }
        } else {
          alert('Failed to remove tag. Please try again.');
        }
      } catch (err) {
        console.error('Tag removal failed:', err);
        alert('Network error. Please try again.');
      }
    });
  });

  // -----------------------------------------------------------
  // Add tag UI scaffold
  // -----------------------------------------------------------
  const addTagBtn = document.getElementById('add-tag-btn');
  const newTagInput = document.getElementById('new-tag-input');

  if (addTagBtn && newTagInput) {
    async function addTag() {
      const imageId = addTagBtn.getAttribute('data-image-id');
      const tagName = newTagInput.value.trim();

      if (!tagName) {
        newTagInput.focus();
        return;
      }

      try {
        const res = await fetch(`/api/images/${imageId}/tags`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({ name: tagName }),
        });

        if (res.ok) {
          const data = await res.json();
          const tag = data.tag || { name: tagName, slug: tagName.toLowerCase(), id: Date.now() };

          // Insert new tag badge before the add form
          const addForm = document.querySelector('.add-tag-form');
          const tagsList = document.querySelector('.tags-list');
          const noTags = tagsList ? tagsList.querySelector('.no-tags') : null;

          if (noTags) noTags.remove();

          if (addForm && tagsList) {
            const badge = document.createElement('span');
            badge.className = 'tag-badge';
            badge.innerHTML = `
              <a href="/gallery?tag=${encodeURIComponent(tag.slug)}" class="tag-link">${escapeHtml(tag.name)}</a>
              <button
                class="tag-remove-btn"
                data-image-id="${imageId}"
                data-tag-id="${tag.id}"
                aria-label="Remove tag ${escapeHtml(tag.name)}"
                title="Remove tag"
              >&times;</button>
            `;

            // Bind remove handler
            const removeBtn = badge.querySelector('.tag-remove-btn');
            if (removeBtn) {
              removeBtn.addEventListener('click', function () {
                removeBtn.closest('.tag-badge').remove();
              });
            }

            tagsList.insertBefore(badge, addForm);
          }

          newTagInput.value = '';
          newTagInput.focus();
        } else {
          const data = await res.json().catch(() => ({}));
          alert(data.error?.message || 'Failed to add tag. Please try again.');
        }
      } catch (err) {
        console.error('Tag add failed:', err);
        alert('Network error. Please try again.');
      }
    }

    addTagBtn.addEventListener('click', addTag);
    newTagInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        addTag();
      }
    });
  }

  // -----------------------------------------------------------
  // Helper: escape HTML for safe insertion
  // -----------------------------------------------------------
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

});