/**
 * Image Editor - Client JS for edit panel on detail page
 * Handles toggle show/hide, form data collection, PATCH via fetch,
 * DOM update with response, and rotation preview.
 */

(function () {
  'use strict';

  let currentRotation = 0;
  let imageId = null;
  let editPanel = null;
  let mainImage = null;
  let isDirty = false;

  const ROTATION_LABELS = {
    0: '0°',
    90: '90° CW',
    180: '180°',
    270: '90° CCW',
    '-1': 'Flip H',
    '-2': 'Flip V'
  };

  function init() {
    editPanel = document.getElementById('edit-panel');
    mainImage = document.getElementById('main-image');

    if (!editPanel) return;

    // Get image ID from data attribute or URL
    const imageContainer = document.getElementById('image-detail-container');
    if (imageContainer) {
      imageId = imageContainer.dataset.imageId;
    }

    if (!imageId) {
      // Fallback: extract from URL
      const match = window.location.pathname.match(/\/images?\/(\d+)/);
      if (match) imageId = match[1];
    }

    // Get current rotation from data attribute
    const rotationEl = document.getElementById('current-rotation');
    if (rotationEl) {
      currentRotation = parseInt(rotationEl.value || '0', 10);
    }

    // Toggle edit panel
    const editToggleBtn = document.getElementById('edit-toggle-btn');
    if (editToggleBtn) {
      editToggleBtn.addEventListener('click', toggleEditPanel);
    }

    // Close / cancel button
    const cancelBtn = document.getElementById('edit-cancel-btn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', cancelEdit);
    }

    // Save button
    const saveBtn = document.getElementById('edit-save-btn');
    if (saveBtn) {
      saveBtn.addEventListener('click', saveChanges);
    }

    // Rotation buttons
    document.querySelectorAll('[data-rotation-action]').forEach(btn => {
      btn.addEventListener('click', () => handleRotationAction(btn.dataset.rotationAction));
    });

    // Delete button
    const deleteBtn = document.getElementById('delete-image-btn');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', handleDelete);
    }

    // Regenerate thumbnails button
    const regenBtn = document.getElementById('regenerate-thumbnails-btn');
    if (regenBtn) {
      regenBtn.addEventListener('click', handleRegenerateThumbnails);
    }

    // Track changes in form inputs
    editPanel.querySelectorAll('input, textarea').forEach(el => {
      el.addEventListener('input', () => { isDirty = true; });
    });

    // Warn before leaving if unsaved changes
    window.addEventListener('beforeunload', (e) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    });
  }

  function toggleEditPanel() {
    if (!editPanel) return;
    const isOpen = editPanel.classList.contains('is-open');
    if (isOpen) {
      closeEditPanel();
    } else {
      openEditPanel();
    }
  }

  function openEditPanel() {
    editPanel.classList.add('is-open');
    const btn = document.getElementById('edit-toggle-btn');
    if (btn) {
      btn.textContent = '✕ Close Editor';
      btn.classList.add('is-light');
    }
  }

  function closeEditPanel() {
    editPanel.classList.remove('is-open');
    const btn = document.getElementById('edit-toggle-btn');
    if (btn) {
      btn.textContent = '✏️ Edit';
      btn.classList.remove('is-light');
    }
  }

  function cancelEdit() {
    if (isDirty && !confirm('Discard unsaved changes?')) return;
    isDirty = false;

    // Reset rotation preview to saved state
    const savedRotation = parseInt(document.getElementById('current-rotation')?.value || '0', 10);
    currentRotation = savedRotation;
    applyRotationPreview(savedRotation);

    // Reset form fields to original values
    const form = document.getElementById('edit-form');
    if (form) form.reset();

    closeEditPanel();
  }

  function handleRotationAction(action) {
    let newRotation = currentRotation;

    switch (action) {
      case 'cw90':
        // Rotate clockwise 90° — handle special flip values
        if (currentRotation >= 0) {
          newRotation = (currentRotation + 90) % 360;
        }
        break;
      case 'ccw90':
        if (currentRotation >= 0) {
          newRotation = (currentRotation + 270) % 360;
        }
        break;
      case 'flipH':
        newRotation = -1;
        break;
      case 'flipV':
        newRotation = -2;
        break;
      default:
        newRotation = parseInt(action, 10) || 0;
    }

    currentRotation = newRotation;
    isDirty = true;

    // Update hidden rotation input
    const rotInput = document.getElementById('rotation-input');
    if (rotInput) rotInput.value = newRotation;

    // Update rotation label
    const rotLabel = document.getElementById('rotation-label');
    if (rotLabel) {
      rotLabel.textContent = `Current: ${ROTATION_LABELS[newRotation] || newRotation + '°'}`;
    }

    // Apply CSS preview
    applyRotationPreview(newRotation);
  }

  function applyRotationPreview(rotation) {
    if (!mainImage) return;

    let transform = '';
    switch (rotation) {
      case 0:
        transform = 'rotate(0deg)';
        break;
      case 90:
        transform = 'rotate(90deg)';
        break;
      case 180:
        transform = 'rotate(180deg)';
        break;
      case 270:
        transform = 'rotate(270deg)';
        break;
      case -1:
        transform = 'scaleX(-1)';
        break;
      case -2:
        transform = 'scaleY(-1)';
        break;
      default:
        transform = `rotate(${rotation}deg)`;
    }

    mainImage.style.transform = transform;
    mainImage.style.transition = 'transform 0.3s ease';
  }

  async function saveChanges() {
    if (!imageId) {
      showError('No image ID found');
      return;
    }

    const saveBtn = document.getElementById('edit-save-btn');
    if (saveBtn) {
      saveBtn.classList.add('is-loading');
      saveBtn.disabled = true;
    }

    try {
      const description = document.getElementById('edit-description')?.value || '';
      const rotationInput = document.getElementById('rotation-input');
      const rotation = rotationInput ? parseInt(rotationInput.value, 10) : 0;

      // Collect manual EXIF fields
      const manualExif = {};
      const captionEl = document.getElementById('edit-caption');
      const locationEl = document.getElementById('edit-location');
      const dateTakenEl = document.getElementById('edit-date-taken');
      const cameraEl = document.getElementById('edit-camera');
      const lensEl = document.getElementById('edit-lens');

      if (captionEl && captionEl.value.trim()) manualExif.caption = captionEl.value.trim();
      if (locationEl && locationEl.value.trim()) manualExif.location = locationEl.value.trim();
      if (dateTakenEl && dateTakenEl.value.trim()) manualExif.dateTaken = dateTakenEl.value.trim();
      if (cameraEl && cameraEl.value.trim()) manualExif.camera = cameraEl.value.trim();
      if (lensEl && lensEl.value.trim()) manualExif.lens = lensEl.value.trim();

      const body = { description, rotation, manualExif };

      const response = await fetch(`/api/images/${imageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save changes');
      }

      // Update DOM with response data
      updateDetailPage(data);
      isDirty = false;

      // Update saved rotation reference
      const currentRotationEl = document.getElementById('current-rotation');
      if (currentRotationEl) currentRotationEl.value = data.rotation || 0;

      showSuccess('Changes saved successfully!');
      closeEditPanel();

      // Refresh image to show new thumbnail/rotation
      if (mainImage) {
        const src = mainImage.src.split('?')[0];
        mainImage.src = `${src}?t=${Date.now()}`;
        mainImage.style.transform = ''; // Remove preview transform — server handles it now
      }
    } catch (err) {
      console.error('Error saving changes:', err);
      showError(err.message || 'Failed to save changes');
    } finally {
      if (saveBtn) {
        saveBtn.classList.remove('is-loading');
        saveBtn.disabled = false;
      }
    }
  }

  function updateDetailPage(imageData) {
    // Update description
    const descEl = document.getElementById('image-description-display');
    if (descEl) {
      descEl.textContent = imageData.description || '';
      descEl.style.display = imageData.description ? '' : 'none';
    }

    // Update manual EXIF display if present
    const manualExif = imageData.manualExif || {};

    const captionDisplay = document.getElementById('display-caption');
    if (captionDisplay) captionDisplay.textContent = manualExif.caption || '';

    const locationDisplay = document.getElementById('display-location');
    if (locationDisplay) locationDisplay.textContent = manualExif.location || '';

    const dateTakenDisplay = document.getElementById('display-date-taken');
    if (dateTakenDisplay) dateTakenDisplay.textContent = manualExif.dateTaken || '';

    const cameraDisplay = document.getElementById('display-camera');
    if (cameraDisplay) cameraDisplay.textContent = manualExif.camera || '';

    const lensDisplay = document.getElementById('display-lens');
    if (lensDisplay) lensDisplay.textContent = manualExif.lens || '';

    // Update page title if filename changed (unlikely but safe)
    if (imageData.originalName) {
      const titleEl = document.querySelector('h1.title');
      if (titleEl) titleEl.textContent = imageData.originalName;
    }
  }

  async function handleDelete() {
    if (!imageId) return;
    if (!confirm('Are you sure you want to permanently delete this image? This cannot be undone.')) return;

    const deleteBtn = document.getElementById('delete-image-btn');
    if (deleteBtn) {
      deleteBtn.classList.add('is-loading');
      deleteBtn.disabled = true;
    }

    try {
      const response = await fetch(`/api/images/${imageId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete image');
      }

      // Redirect to gallery after deletion
      showSuccess('Image deleted. Redirecting...');
      setTimeout(() => {
        window.location.href = '/gallery';
      }, 1000);
    } catch (err) {
      console.error('Error deleting image:', err);
      showError(err.message || 'Failed to delete image');
      if (deleteBtn) {
        deleteBtn.classList.remove('is-loading');
        deleteBtn.disabled = false;
      }
    }
  }

  async function handleRegenerateThumbnails() {
    if (!imageId) return;

    const regenBtn = document.getElementById('regenerate-thumbnails-btn');
    if (regenBtn) {
      regenBtn.classList.add('is-loading');
      regenBtn.disabled = true;
    }

    try {
      const response = await fetch(`/api/images/${imageId}/regenerate-thumbnails`, {
        method: 'POST'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to regenerate thumbnails');
      }

      showSuccess('Thumbnails regenerated successfully!');

      // Refresh image src to show updated thumbnail
      if (mainImage) {
        const src = mainImage.src.split('?')[0];
        mainImage.src = `${src}?t=${Date.now()}`;
      }
    } catch (err) {
      console.error('Error regenerating thumbnails:', err);
      showError(err.message || 'Failed to regenerate thumbnails');
    } finally {
      if (regenBtn) {
        regenBtn.classList.remove('is-loading');
        regenBtn.disabled = false;
      }
    }
  }

  function showSuccess(message) {
    showToast(message, 'is-success');
  }

  function showError(message) {
    showToast(message, 'is-danger');
  }

  function showToast(message, type = 'is-info') {
    document.querySelectorAll('.editor-toast').forEach(el => el.remove());

    const toast = document.createElement('div');
    toast.className = `notification ${type} editor-toast`;
    toast.style.cssText = `
      position: fixed;
      bottom: 1.5rem;
      right: 1.5rem;
      z-index: 9999;
      max-width: 380px;
      animation: slideUp 0.3s ease;
      box-shadow: 0 4px 20px rgba(0,0,0,0.2);
    `;
    toast.innerHTML = `<button class="delete"></button>${message}`;
    toast.querySelector('.delete').addEventListener('click', () => toast.remove());
    document.body.appendChild(toast);

    setTimeout(() => {
      if (toast.parentNode) toast.remove();
    }, 4000);
  }

  // Initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();