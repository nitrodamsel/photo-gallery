/**
 * imageEditor.js
 * Client-side JS for the image detail edit panel.
 * Handles panel open/close, rotation preview, form submission via PATCH.
 */
(function () {
  'use strict';

  // ─── State ────────────────────────────────────────────────────────────────
  let currentRotation = 0;
  let currentFlip = 1; // 1 = normal, -1 = flipped horizontally
  let imageId = null;

  // ─── DOM refs ──────────────────────────────────────────────────────────────
  const panel = document.getElementById('edit-panel');
  const backdrop = document.getElementById('edit-panel-backdrop');
  const closeBtn = document.getElementById('edit-panel-close');
  const cancelBtn = document.getElementById('edit-cancel-btn');
  const openBtn = document.getElementById('open-edit-panel-btn');
  const form = document.getElementById('edit-image-form');
  const feedback = document.getElementById('edit-feedback');
  const rotationInput = document.getElementById('edit-rotation');
  const rotationLabel = document.getElementById('rotation-label');
  const previewImg = document.getElementById('rotation-preview-img');
  const saveBtn = document.getElementById('edit-save-btn');
  const deleteBtn = document.getElementById('delete-image-btn');
  const regenBtn = document.getElementById('regenerate-thumbs-btn');

  // ─── Init ──────────────────────────────────────────────────────────────────
  function init() {
    if (!panel) return; // Not on detail page

    // Read initial values from DOM
    imageId = panel.closest('[data-image-id]')
      ? panel.closest('[data-image-id]').dataset.imageId
      : document.body.dataset.imageId;

    if (rotationInput) {
      currentRotation = parseInt(rotationInput.value, 10) || 0;
    }
    if (previewImg) {
      currentFlip = parseInt(previewImg.dataset.flip, 10) || 1;
    }

    bindEvents();
  }

  // ─── Panel open/close ─────────────────────────────────────────────────────
  function openPanel() {
    panel.classList.add('edit-panel--open');
    panel.setAttribute('aria-hidden', 'false');
    document.body.classList.add('edit-panel-body-lock');
    closeBtn && closeBtn.focus();
  }

  function closePanel() {
    panel.classList.remove('edit-panel--open');
    panel.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('edit-panel-body-lock');
    clearFeedback();
    openBtn && openBtn.focus();
  }

  // ─── Rotation preview ─────────────────────────────────────────────────────
  function updateRotationPreview() {
    if (!previewImg) return;
    previewImg.style.transform = `rotate(${currentRotation}deg) scaleX(${currentFlip})`;
    if (rotationLabel) {
      rotationLabel.textContent = currentFlip === -1
        ? `${currentRotation}° (flipped)`
        : `${currentRotation}°`;
    }
    if (rotationInput) {
      rotationInput.value = currentRotation;
    }
  }

  function handleRotationBtn(action) {
    switch (action) {
      case 'cw':
        currentRotation = (currentRotation + 90) % 360;
        break;
      case 'ccw':
        currentRotation = (currentRotation - 90 + 360) % 360;
        break;
      case 'fliph':
        currentFlip = currentFlip === 1 ? -1 : 1;
        break;
      case 'reset':
        currentRotation = 0;
        currentFlip = 1;
        break;
    }
    updateRotationPreview();
  }

  // ─── Form submission ──────────────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault();
    if (!imageId) return;

    clearFeedback();
    setSavingState(true);

    try {
      const formData = new FormData(form);

      // Build payload
      const payload = {
        description: formData.get('description') || '',
        rotation: currentRotation,
        manualExif: {
          caption: formData.get('manualExif[caption]') || '',
          locationName: formData.get('manualExif[locationName]') || '',
          dateTaken: formData.get('manualExif[dateTaken]') || '',
          camera: formData.get('manualExif[camera]') || ''
        }
      };

      const res = await fetch(`/api/images/${imageId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Save failed');
      }

      // Update page DOM without reload
      updateDetailPage(data.image);
      showFeedback('Changes saved successfully!', 'success');

    } catch (err) {
      console.error('Save error:', err);
      showFeedback(err.message || 'Failed to save changes. Please try again.', 'error');
    } finally {
      setSavingState(false);
    }
  }

  // ─── Delete image ─────────────────────────────────────────────────────────
  async function handleDelete() {
    if (!imageId) return;

    const confirmed = window.confirm(
      'Are you sure you want to delete this image? This action cannot be undone.'
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/images/${imageId}`, {
        method: 'DELETE',
        headers: { 'Accept': 'application/json' }
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Delete failed');
      }

      // Redirect to gallery
      window.location.href = '/gallery';
    } catch (err) {
      console.error('Delete error:', err);
      showFeedback(err.message || 'Failed to delete image.', 'error');
    }
  }

  // ─── Regenerate thumbnails ────────────────────────────────────────────────
  async function handleRegenThumbs() {
    if (!imageId) return;

    if (regenBtn) {
      regenBtn.disabled = true;
      regenBtn.textContent = 'Regenerating…';
    }

    try {
      const res = await fetch(`/api/images/${imageId}/regenerate-thumbnails`, {
        method: 'POST',
        headers: { 'Accept': 'application/json' }
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Regeneration failed');
      }

      showFeedback('Thumbnails regenerated successfully!', 'success');

      // Bust thumbnail cache on page by appending timestamp
      const mainImg = document.querySelector('.image-detail-main img');
      if (mainImg) {
        const src = mainImg.src.split('?')[0];
        mainImg.src = `${src}?t=${Date.now()}`;
      }
    } catch (err) {
      console.error('Regen error:', err);
      showFeedback(err.message || 'Failed to regenerate thumbnails.', 'error');
    } finally {
      if (regenBtn) {
        regenBtn.disabled = false;
        regenBtn.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
          </svg>
          Regenerate Thumbnails
        `;
      }
    }
  }

  // ─── DOM update helpers ───────────────────────────────────────────────────
  function updateDetailPage(image) {
    if (!image) return;

    // Update description
    const descEl = document.querySelector('.image-detail-description');
    if (descEl) {
      descEl.textContent = image.description || '';
    }

    // Update rotation on main image via CSS (for immediate visual feedback)
    const mainImgEl = document.querySelector('.image-detail-main img');
    if (mainImgEl) {
      mainImgEl.style.transform = `rotate(${image.rotation || 0}deg) scaleX(${currentFlip})`;
    }

    // Update manual EXIF fields in EXIF table if they exist
    const captionEl = document.querySelector('[data-exif-field="caption"]');
    if (captionEl && image.manualExif) {
      captionEl.textContent = image.manualExif.caption || '';
    }

    const locationEl = document.querySelector('[data-exif-field="locationName"]');
    if (locationEl && image.manualExif) {
      locationEl.textContent = image.manualExif.locationName || '';
    }

    // Update page title if we have a caption
    if (image.manualExif && image.manualExif.caption) {
      const titleEl = document.querySelector('.image-detail-title');
      if (titleEl) {
        titleEl.textContent = image.manualExif.caption;
      }
    }
  }

  // ─── Feedback helpers ─────────────────────────────────────────────────────
  function showFeedback(message, type = 'info') {
    if (!feedback) return;
    feedback.textContent = message;
    feedback.className = `edit-feedback edit-feedback--${type}`;
    feedback.style.display = 'block';

    if (type === 'success') {
      setTimeout(clearFeedback, 4000);
    }
  }

  function clearFeedback() {
    if (!feedback) return;
    feedback.textContent = '';
    feedback.style.display = 'none';
    feedback.className = 'edit-feedback';
  }

  function setSavingState(saving) {
    if (!saveBtn) return;
    saveBtn.disabled = saving;
    if (saving) {
      saveBtn.innerHTML = `
        <svg class="spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
        </svg>
        Saving…
      `;
    } else {
      saveBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
          <polyline points="17 21 17 13 7 13 7 21"/>
          <polyline points="7 3 7 8 15 8"/>
        </svg>
        Save Changes
      `;
    }
  }

  // ─── Event bindings ───────────────────────────────────────────────────────
  function bindEvents() {
    // Open panel
    if (openBtn) {
      openBtn.addEventListener('click', openPanel);
    }

    // Close panel
    if (closeBtn) closeBtn.addEventListener('click', closePanel);
    if (cancelBtn) cancelBtn.addEventListener('click', closePanel);
    if (backdrop) backdrop.addEventListener('click', closePanel);

    // Keyboard close (Escape)
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && panel.classList.contains('edit-panel--open')) {
        closePanel();
      }
    });

    // Rotation buttons
    const rotBtns = document.querySelectorAll('.rotation-btn');
    rotBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        handleRotationBtn(btn.dataset.action);
      });
    });

    // Form submit
    if (form) form.addEventListener('submit', handleSubmit);

    // Delete
    if (deleteBtn) deleteBtn.addEventListener('click', handleDelete);

    // Regenerate thumbnails
    if (regenBtn) regenBtn.addEventListener('click', handleRegenThumbs);
  }

  // ─── Boot ─────────────────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();