/**
 * Image Editor - handles the edit panel on the image detail page
 * Supports: description editing, rotation, manual EXIF overrides, delete
 */

(function () {
  'use strict';

  const panel = document.getElementById('edit-panel');
  const overlay = document.getElementById('edit-panel-overlay');
  const openBtn = document.getElementById('open-edit-panel-btn');
  const closeBtn = document.getElementById('edit-panel-close');
  const cancelBtn = document.getElementById('edit-cancel-btn');
  const deleteBtn = document.getElementById('edit-delete-btn');
  const regenBtn = document.getElementById('regenerate-thumbnails-btn');
  const form = document.getElementById('edit-form');
  const statusEl = document.getElementById('edit-status');
  const rotationInput = document.getElementById('edit-rotation');
  const rotationDisplay = document.getElementById('rotation-value-display');

  if (!panel) return; // Not on detail page

  const imageId = panel.closest('[data-image-id]')
    ? panel.closest('[data-image-id]').dataset.imageId
    : document.querySelector('[data-image-id]')?.dataset.imageId;

  // Get image preview element for live rotation preview
  const imagePreview = document.getElementById('detail-image') || document.querySelector('.detail-image img');

  let currentRotation = parseInt(rotationInput?.value || '0', 10);
  let previewRotation = currentRotation;
  let isFlipped = false;
  let isSaving = false;

  // ─── Panel Open/Close ─────────────────────────────────────────────────────

  function openPanel() {
    panel.classList.add('is-open');
    overlay.classList.add('is-visible');
    panel.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    // Focus first input
    setTimeout(() => {
      const firstInput = panel.querySelector('textarea, input');
      if (firstInput) firstInput.focus();
    }, 300);
  }

  function closePanel() {
    panel.classList.remove('is-open');
    overlay.classList.remove('is-visible');
    panel.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';

    // Reset preview rotation to saved rotation
    previewRotation = currentRotation;
    updateImagePreview();
    clearStatus();
  }

  if (openBtn) openBtn.addEventListener('click', openPanel);
  if (closeBtn) closeBtn.addEventListener('click', closePanel);
  if (cancelBtn) cancelBtn.addEventListener('click', closePanel);
  if (overlay) overlay.addEventListener('click', closePanel);

  // Keyboard close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && panel.classList.contains('is-open')) {
      closePanel();
    }
  });

  // ─── Rotation Controls ────────────────────────────────────────────────────

  function updateImagePreview() {
    if (!imagePreview) return;

    let transform = `rotate(${previewRotation}deg)`;
    if (isFlipped) transform += ' scaleX(-1)';
    imagePreview.style.transform = transform;
    imagePreview.style.transition = 'transform 0.3s ease';
  }

  function updateRotationDisplay() {
    if (rotationDisplay) {
      rotationDisplay.textContent = `${previewRotation}°`;
    }
    if (rotationInput) {
      rotationInput.value = previewRotation;
    }
  }

  document.querySelectorAll('.rotation-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;

      if (action === 'cw') {
        previewRotation = (previewRotation + 90) % 360;
      } else if (action === 'ccw') {
        previewRotation = (previewRotation - 90 + 360) % 360;
      } else if (action === 'flip') {
        isFlipped = !isFlipped;
        btn.classList.toggle('is-active', isFlipped);
      }

      updateImagePreview();
      updateRotationDisplay();
    });
  });

  // ─── Status Messages ──────────────────────────────────────────────────────

  function showStatus(message, type = 'info') {
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.className = `edit-status edit-status--${type} is-visible`;

    if (type === 'success') {
      setTimeout(clearStatus, 4000);
    }
  }

  function clearStatus() {
    if (!statusEl) return;
    statusEl.textContent = '';
    statusEl.className = 'edit-status';
  }

  // ─── Form Submission (Save) ───────────────────────────────────────────────

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (isSaving) return;

      const saveBtn = document.getElementById('edit-save-btn');
      isSaving = true;
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';
      }
      clearStatus();

      const description = document.getElementById('edit-description')?.value || '';
      const rotation = parseInt(rotationInput?.value || '0', 10);

      const manualExif = {
        caption: document.getElementById('edit-caption')?.value?.trim() || '',
        locationName: document.getElementById('edit-location')?.value?.trim() || '',
        dateTaken: document.getElementById('edit-date-taken')?.value || '',
        camera: document.getElementById('edit-camera')?.value?.trim() || ''
      };

      // Remove empty fields
      Object.keys(manualExif).forEach(key => {
        if (!manualExif[key]) delete manualExif[key];
      });

      try {
        const response = await fetch(`/api/images/${imageId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ description, rotation, manualExif })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to save changes');
        }

        // Update current rotation
        currentRotation = data.rotation || 0;
        previewRotation = currentRotation;

        // Update page DOM without reload
        updateDetailPage(data);
        showStatus('Changes saved successfully!', 'success');

      } catch (err) {
        console.error('Save error:', err);
        showStatus(`Error: ${err.message}`, 'error');
      } finally {
        isSaving = false;
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
            Save Changes
          `;
        }
      }
    });
  }

  // ─── Update Detail Page DOM ───────────────────────────────────────────────

  function updateDetailPage(data) {
    // Update description display
    const descriptionEl = document.getElementById('image-description-display');
    if (descriptionEl) {
      if (data.description) {
        descriptionEl.textContent = data.description;
        descriptionEl.style.display = '';
      } else {
        descriptionEl.textContent = '';
      }
    }

    // Update page title if filename shown
    const titleEl = document.querySelector('.image-detail-title');
    if (titleEl && data.originalName) {
      // Keep title as is, unless you want to update it
    }

    // Apply final rotation to image preview
    updateImagePreview();

    // Update manual EXIF display if present
    if (data.manualExif) {
      const captionEl = document.getElementById('exif-caption-display');
      if (captionEl) captionEl.textContent = data.manualExif.caption || '';

      const locationEl = document.getElementById('exif-location-display');
      if (locationEl) locationEl.textContent = data.manualExif.locationName || '';

      const dateEl = document.getElementById('exif-date-display');
      if (dateEl) dateEl.textContent = data.manualExif.dateTaken
        ? new Date(data.manualExif.dateTaken).toLocaleString()
        : '';

      const cameraEl = document.getElementById('exif-camera-display');
      if (cameraEl) cameraEl.textContent = data.manualExif.camera || '';
    }
  }

  // ─── Delete Image ─────────────────────────────────────────────────────────

  if (deleteBtn) {
    deleteBtn.addEventListener('click', async () => {
      const confirmed = window.confirm(
        'Are you sure you want to permanently delete this image? This action cannot be undone.'
      );
      if (!confirmed) return;

      deleteBtn.disabled = true;
      deleteBtn.textContent = 'Deleting...';
      clearStatus();

      try {
        const response = await fetch(`/api/images/${imageId}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to delete image');
        }

        showStatus('Image deleted. Redirecting...', 'success');
        setTimeout(() => {
          window.location.href = '/gallery';
        }, 1500);

      } catch (err) {
        console.error('Delete error:', err);
        showStatus(`Error: ${err.message}`, 'error');
        deleteBtn.disabled = false;
        deleteBtn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
          Delete Image
        `;
      }
    });
  }

  // ─── Regenerate Thumbnails ────────────────────────────────────────────────

  if (regenBtn) {
    regenBtn.addEventListener('click', async () => {
      regenBtn.disabled = true;
      regenBtn.textContent = 'Regenerating...';
      clearStatus();

      try {
        const response = await fetch(`/api/images/${imageId}/regenerate-thumbnails`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to regenerate thumbnails');
        }

        showStatus('Thumbnails regenerated successfully!', 'success');

        // Bust thumbnail cache on page by re-loading images with timestamp
        document.querySelectorAll('img[src*="thumb_"]').forEach(img => {
          const src = img.src.split('?')[0];
          img.src = `${src}?t=${Date.now()}`;
        });

      } catch (err) {
        console.error('Regen error:', err);
        showStatus(`Error: ${err.message}`, 'error');
      } finally {
        regenBtn.disabled = false;
        regenBtn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
          Regenerate Thumbnails
        `;
      }
    });
  }

})();