/**
 * imageEditor.js — Client-side logic for the image detail edit panel
 * Handles panel show/hide, rotation preview, form submission via PATCH API
 */

(function () {
  'use strict';

  // --- State ---
  let currentRotation = 0;
  let currentFlipH = false;
  let originalRotation = 0;
  let originalFlipH = false;
  let imageId = null;

  // --- DOM Elements ---
  const editPanel = document.getElementById('edit-panel');
  const editOverlay = document.getElementById('edit-panel-overlay');
  const editForm = document.getElementById('edit-form');
  const openBtn = document.getElementById('btn-open-editor');
  const closeBtn = document.getElementById('edit-panel-close');
  const cancelBtn = document.getElementById('edit-cancel-btn');
  const saveBtn = document.getElementById('edit-save-btn');
  const statusEl = document.getElementById('edit-status');
  const rotationInput = document.getElementById('edit-rotation');
  const flipHInput = document.getElementById('edit-flip-h');
  const previewImg = document.getElementById('rotation-preview-img');
  const deleteBtn = document.getElementById('btn-delete-image');
  const regenBtn = document.getElementById('btn-regen-thumbnails');

  if (!editPanel) return; // Not on the detail page

  // Read initial values from DOM
  function init() {
    imageId = editPanel.closest('[data-image-id]')
      ? editPanel.closest('[data-image-id]').dataset.imageId
      : document.querySelector('[data-image-id]')?.dataset.imageId;

    // Also try getting from URL
    if (!imageId) {
      const match = window.location.pathname.match(/\/images?\/(\d+)/);
      if (match) imageId = match[1];
    }

    currentRotation = parseInt(rotationInput?.value || '0', 10);
    currentFlipH = flipHInput?.value === 'true';
    originalRotation = currentRotation;
    originalFlipH = currentFlipH;

    updatePreview();
    bindEvents();
  }

  // --- Panel Open/Close ---
  function openPanel() {
    editPanel.classList.add('edit-panel--open');
    editOverlay.classList.add('edit-panel-overlay--visible');
    editPanel.setAttribute('aria-hidden', 'false');
    document.body.classList.add('edit-panel-body-lock');
    clearStatus();
  }

  function closePanel() {
    editPanel.classList.remove('edit-panel--open');
    editOverlay.classList.remove('edit-panel-overlay--visible');
    editPanel.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('edit-panel-body-lock');
  }

  // --- Rotation Logic ---
  function normalizeRotation(deg) {
    return ((deg % 360) + 360) % 360;
  }

  function updatePreview() {
    if (!previewImg) return;
    let transform = `rotate(${currentRotation}deg)`;
    if (currentFlipH) {
      transform += ' scaleX(-1)';
    }
    previewImg.style.transform = transform;
    previewImg.style.transition = 'transform 0.3s ease';

    if (rotationInput) rotationInput.value = currentRotation;
    if (flipHInput) flipHInput.value = currentFlipH ? 'true' : 'false';
  }

  // --- Status Messages ---
  function showStatus(message, type = 'info') {
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.className = `edit-status edit-status--${type}`;
    statusEl.style.display = 'block';
  }

  function clearStatus() {
    if (!statusEl) return;
    statusEl.textContent = '';
    statusEl.style.display = 'none';
    statusEl.className = 'edit-status';
  }

  // --- Form Submission ---
  async function handleSave(e) {
    e.preventDefault();
    if (!imageId) {
      showStatus('Could not determine image ID.', 'error');
      return;
    }

    const formData = new FormData(editForm);

    // Build manualExif object
    const manualExif = {};
    const captionVal = document.getElementById('edit-caption')?.value.trim();
    const locationVal = document.getElementById('edit-location')?.value.trim();
    const dateTakenVal = document.getElementById('edit-date-taken')?.value;
    const cameraVal = document.getElementById('edit-camera')?.value.trim();

    if (captionVal) manualExif.caption = captionVal;
    if (locationVal) manualExif.locationName = locationVal;
    if (dateTakenVal) manualExif.dateTaken = dateTakenVal;
    if (cameraVal) manualExif.camera = cameraVal;

    const payload = {
      description: document.getElementById('edit-description')?.value || '',
      manualExif,
      rotation: currentRotation,
      flipH: currentFlipH
    };

    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving…';
    clearStatus();

    try {
      const response = await fetch(`/api/images/${imageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Server error ${response.status}`);
      }

      // Update the page DOM with new data
      updatePageDOM(data.image);
      originalRotation = currentRotation;
      originalFlipH = currentFlipH;

      showStatus('Changes saved successfully!', 'success');

      // Auto-close after a short delay
      setTimeout(() => {
        closePanel();
        clearStatus();
      }, 1500);

    } catch (err) {
      console.error('Save failed:', err);
      showStatus(`Failed to save: ${err.message}`, 'error');
    } finally {
      saveBtn.disabled = false;
      saveBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;vertical-align:middle;">
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
          <polyline points="17 21 17 13 7 13 7 21"></polyline>
          <polyline points="7 3 7 8 15 8"></polyline>
        </svg>
        Save Changes`;
    }
  }

  // Update detail page DOM without full reload
  function updatePageDOM(image) {
    if (!image) return;

    // Update description
    const descEl = document.getElementById('image-description');
    if (descEl) {
      descEl.textContent = image.description || '';
      descEl.style.display = image.description ? '' : 'none';
    }

    // Update main image with cache-busting
    const mainImg = document.getElementById('main-image');
    if (mainImg) {
      const src = mainImg.src.split('?')[0];
      mainImg.src = `${src}?t=${Date.now()}`;
      // Apply CSS transform for immediate visual feedback
      let transform = `rotate(${currentRotation}deg)`;
      if (currentFlipH) transform += ' scaleX(-1)';
      mainImg.style.transform = transform;
    }

    // Update manualExif fields if visible on page
    const exifSection = document.getElementById('manual-exif-section');
    if (exifSection && image.manualExif) {
      const exif = typeof image.manualExif === 'string'
        ? JSON.parse(image.manualExif)
        : image.manualExif;

      const captionEl = document.getElementById('exif-caption');
      if (captionEl && exif.caption) captionEl.textContent = exif.caption;

      const locationEl = document.getElementById('exif-location');
      if (locationEl && exif.locationName) locationEl.textContent = exif.locationName;

      const dateEl = document.getElementById('exif-date-taken');
      if (dateEl && exif.dateTaken) dateEl.textContent = new Date(exif.dateTaken).toLocaleString();
    }
  }

  // --- Delete ---
  async function handleDelete() {
    if (!imageId) return;
    if (!confirm('Are you sure you want to permanently delete this image? This cannot be undone.')) return;

    try {
      const response = await fetch(`/api/images/${imageId}`, { method: 'DELETE' });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Delete failed');

      // Redirect to gallery
      window.location.href = '/gallery';
    } catch (err) {
      showStatus(`Delete failed: ${err.message}`, 'error');
    }
  }

  // --- Regenerate Thumbnails ---
  async function handleRegenThumbnails() {
    if (!imageId) return;
    regenBtn.disabled = true;
    regenBtn.textContent = 'Regenerating…';
    clearStatus();

    try {
      const response = await fetch(`/api/images/${imageId}/regenerate-thumbnails`, { method: 'POST' });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Failed');

      showStatus('Thumbnails regenerated!', 'success');

      // Bust cache on preview image
      if (previewImg) {
        const src = previewImg.src.split('?')[0];
        previewImg.src = `${src}?t=${Date.now()}`;
      }
    } catch (err) {
      showStatus(`Failed: ${err.message}`, 'error');
    } finally {
      regenBtn.disabled = false;
      regenBtn.textContent = 'Regenerate Thumbnails';
    }
  }

  // --- Event Binding ---
  function bindEvents() {
    if (openBtn) openBtn.addEventListener('click', openPanel);
    if (closeBtn) closeBtn.addEventListener('click', closePanel);
    if (cancelBtn) cancelBtn.addEventListener('click', closePanel);
    if (editOverlay) editOverlay.addEventListener('click', closePanel);
    if (editForm) editForm.addEventListener('submit', handleSave);
    if (deleteBtn) deleteBtn.addEventListener('click', handleDelete);
    if (regenBtn) regenBtn.addEventListener('click', handleRegenThumbnails);

    // Rotation buttons
    document.getElementById('btn-rotate-cw')?.addEventListener('click', () => {
      currentRotation = normalizeRotation(currentRotation + 90);
      updatePreview();
    });

    document.getElementById('btn-rotate-ccw')?.addEventListener('click', () => {
      currentRotation = normalizeRotation(currentRotation - 90);
      updatePreview();
    });

    document.getElementById('btn-flip-h')?.addEventListener('click', () => {
      currentFlipH = !currentFlipH;
      updatePreview();
    });

    document.getElementById('btn-reset-rotation')?.addEventListener('click', () => {
      currentRotation = 0;
      currentFlipH = false;
      updatePreview();
    });

    // Keyboard: Escape to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && editPanel.classList.contains('edit-panel--open')) {
        closePanel();
      }
    });
  }

  // --- Init ---
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();