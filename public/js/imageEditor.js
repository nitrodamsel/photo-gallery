/**
 * Image Editor — Client JS for edit panel on detail page
 * Handles toggle, form collection, PATCH requests, DOM updates
 */

(function () {
  'use strict';

  const ROTATION_STEP = 90;

  let currentRotation = 0;
  let originalRotation = 0;
  let imageId = null;
  let editPanel = null;
  let previewImage = null;

  function init() {
    editPanel = document.getElementById('edit-panel');
    if (!editPanel) return;

    previewImage = document.getElementById('main-image-preview');

    const imageEl = document.getElementById('image-detail-container');
    imageId = imageEl ? imageEl.dataset.imageId : null;

    if (!imageId) return;

    // Get current rotation from data attribute
    const rotationData = editPanel.dataset.currentRotation;
    currentRotation = rotationData ? parseInt(rotationData, 10) : 0;
    originalRotation = currentRotation;

    // Bind toggle button
    const toggleBtn = document.getElementById('edit-panel-toggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', toggleEditPanel);
    }

    // Bind rotation buttons
    const rotateCwBtn = document.getElementById('rotate-cw-btn');
    const rotateCcwBtn = document.getElementById('rotate-ccw-btn');
    const flipHBtn = document.getElementById('flip-h-btn');

    if (rotateCwBtn) rotateCwBtn.addEventListener('click', rotateCW);
    if (rotateCcwBtn) rotateCcwBtn.addEventListener('click', rotateCCW);
    if (flipHBtn) flipHBtn.addEventListener('click', flipHorizontal);

    // Bind save and cancel
    const saveBtn = document.getElementById('edit-save-btn');
    const cancelBtn = document.getElementById('edit-cancel-btn');
    const deleteBtn = document.getElementById('delete-image-btn');

    if (saveBtn) saveBtn.addEventListener('click', saveChanges);
    if (cancelBtn) cancelBtn.addEventListener('click', cancelEdit);
    if (deleteBtn) deleteBtn.addEventListener('click', deleteImage);

    // Regenerate thumbnails button
    const regenBtn = document.getElementById('regenerate-thumbnails-btn');
    if (regenBtn) regenBtn.addEventListener('click', regenerateThumbnails);

    updateRotationDisplay();
  }

  function toggleEditPanel() {
    if (!editPanel) return;
    const isHidden = editPanel.classList.contains('is-hidden') ||
                     editPanel.style.display === 'none' ||
                     editPanel.classList.contains('panel-closed');

    if (isHidden) {
      openEditPanel();
    } else {
      closeEditPanel();
    }
  }

  function openEditPanel() {
    editPanel.classList.remove('is-hidden', 'panel-closed');
    editPanel.classList.add('panel-open');
    editPanel.removeAttribute('hidden');

    const toggleBtn = document.getElementById('edit-panel-toggle');
    if (toggleBtn) {
      toggleBtn.textContent = 'Close Editor';
      toggleBtn.classList.add('is-warning');
      toggleBtn.classList.remove('is-info');
    }
  }

  function closeEditPanel() {
    editPanel.classList.add('panel-closed');
    editPanel.classList.remove('panel-open');

    const toggleBtn = document.getElementById('edit-panel-toggle');
    if (toggleBtn) {
      toggleBtn.textContent = 'Edit Image';
      toggleBtn.classList.remove('is-warning');
      toggleBtn.classList.add('is-info');
    }
  }

  function rotateCW() {
    currentRotation = (currentRotation + 90) % 360;
    updateRotationDisplay();
  }

  function rotateCCW() {
    currentRotation = (currentRotation - 90 + 360) % 360;
    updateRotationDisplay();
  }

  function flipHorizontal() {
    // Flip horizontal is represented as a special value
    // For simplicity, we'll toggle between normal and a flip indicator
    // Since we support 0/90/180/270, flip is stored separately
    // Show visual flip via CSS scaleX
    if (previewImage) {
      const currentTransform = previewImage.style.transform || '';
      if (currentTransform.includes('scaleX(-1)')) {
        previewImage.style.transform = currentTransform.replace(' scaleX(-1)', '').replace('scaleX(-1)', '').trim();
      } else {
        previewImage.style.transform = (currentTransform + ' scaleX(-1)').trim();
      }
    }
    // Note: flip is a visual-only preview in this implementation
    // since the backend stores rotation as 0/90/180/270
    showInlineNote('Note: Flip is shown as preview only. Save to apply rotation.');
  }

  function updateRotationDisplay() {
    // Update live CSS preview on the main image
    if (previewImage) {
      // Remove old rotation, keep flip if any
      const existing = previewImage.style.transform || '';
      const flipPart = existing.includes('scaleX(-1)') ? ' scaleX(-1)' : '';
      previewImage.style.transform = `rotate(${currentRotation}deg)${flipPart}`;
    }

    // Update the rotation value display in the edit panel
    const rotationDisplay = document.getElementById('current-rotation-display');
    if (rotationDisplay) {
      rotationDisplay.textContent = `${currentRotation}°`;
    }

    // Update hidden input
    const rotationInput = document.getElementById('rotation-input');
    if (rotationInput) {
      rotationInput.value = currentRotation;
    }
  }

  async function saveChanges() {
    const saveBtn = document.getElementById('edit-save-btn');
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving...';
    }

    try {
      const description = document.getElementById('edit-description')?.value || '';

      const manualExif = {
        caption: document.getElementById('edit-caption')?.value || '',
        locationName: document.getElementById('edit-location-name')?.value || '',
        dateTaken: document.getElementById('edit-date-taken')?.value || ''
      };

      // Remove empty manualExif fields
      Object.keys(manualExif).forEach(key => {
        if (!manualExif[key]) delete manualExif[key];
      });

      const body = {
        description,
        rotation: currentRotation
      };

      if (Object.keys(manualExif).length > 0) {
        body.manualExif = manualExif;
      }

      const response = await fetch(`/api/images/${imageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const result = await response.json();

      if (!response.ok) {
        showError(result.error || 'Failed to save changes');
        return;
      }

      // Update DOM with new data without page reload
      updateDetailPageDOM(result);
      originalRotation = currentRotation;

      showSuccess('Changes saved successfully!');
      closeEditPanel();

    } catch (err) {
      console.error('Save error:', err);
      showError('Failed to save changes. Please try again.');
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Changes';
      }
    }
  }

  function cancelEdit() {
    // Revert rotation preview
    currentRotation = originalRotation;
    updateRotationDisplay();

    // Revert form fields
    const descriptionEl = document.getElementById('edit-description');
    if (descriptionEl) {
      const originalDesc = editPanel.dataset.originalDescription || '';
      descriptionEl.value = originalDesc;
    }

    closeEditPanel();
  }

  async function deleteImage() {
    const confirmed = confirm('Are you sure you want to delete this image? This cannot be undone.');
    if (!confirmed) return;

    const deleteBtn = document.getElementById('delete-image-btn');
    if (deleteBtn) {
      deleteBtn.disabled = true;
      deleteBtn.textContent = 'Deleting...';
    }

    try {
      const response = await fetch(`/api/images/${imageId}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (!response.ok) {
        showError(result.error || 'Failed to delete image');
        if (deleteBtn) {
          deleteBtn.disabled = false;
          deleteBtn.textContent = 'Delete Image';
        }
        return;
      }

      // Redirect to gallery after deletion
      showSuccess('Image deleted. Redirecting...');
      setTimeout(() => {
        window.location.href = '/gallery';
      }, 1500);

    } catch (err) {
      console.error('Delete error:', err);
      showError('Failed to delete image. Please try again.');
      if (deleteBtn) {
        deleteBtn.disabled = false;
        deleteBtn.textContent = 'Delete Image';
      }
    }
  }

  async function regenerateThumbnails() {
    const regenBtn = document.getElementById('regenerate-thumbnails-btn');
    if (regenBtn) {
      regenBtn.disabled = true;
      regenBtn.textContent = 'Regenerating...';
    }

    try {
      const response = await fetch(`/api/images/${imageId}/regenerate-thumbnails`, {
        method: 'POST'
      });

      const result = await response.json();

      if (!response.ok) {
        showError(result.error || 'Failed to regenerate thumbnails');
        return;
      }

      showSuccess('Thumbnails regenerated successfully!');

      // Reload the page to show updated thumbnails
      setTimeout(() => window.location.reload(), 1500);

    } catch (err) {
      console.error('Regenerate thumbnails error:', err);
      showError('Failed to regenerate thumbnails. Please try again.');
    } finally {
      if (regenBtn) {
        regenBtn.disabled = false;
        regenBtn.textContent = 'Regenerate Thumbnails';
      }
    }
  }

  function updateDetailPageDOM(imageData) {
    // Update description
    const descDisplay = document.getElementById('image-description-display');
    if (descDisplay) {
      descDisplay.textContent = imageData.description || '';
    }

    // Update the edit form fields too
    const editDescEl = document.getElementById('edit-description');
    if (editDescEl) {
      editDescEl.value = imageData.description || '';
    }

    // Update edit panel's original description tracker
    if (editPanel) {
      editPanel.dataset.originalDescription = imageData.description || '';
      editPanel.dataset.currentRotation = imageData.rotation || 0;
    }

    // Update manual EXIF displays if they exist
    const manualExif = imageData.manualExif || {};

    const captionDisplay = document.getElementById('manual-caption-display');
    if (captionDisplay) captionDisplay.textContent = manualExif.caption || '';

    const locationDisplay = document.getElementById('manual-location-display');
    if (locationDisplay) locationDisplay.textContent = manualExif.locationName || '';

    const dateDisplay = document.getElementById('manual-date-display');
    if (dateDisplay) dateDisplay.textContent = manualExif.dateTaken || '';

    // Update the main image to reflect new rotation (reload src with cache-bust)
    if (previewImage && imageData.rotation !== undefined) {
      const src = previewImage.src;
      const baseSrc = src.split('?')[0];
      previewImage.src = `${baseSrc}?t=${Date.now()}`;
      // Reset CSS transform since server now serves rotated image
      setTimeout(() => {
        previewImage.style.transform = '';
      }, 100);
    }
  }

  function showError(message) {
    showNotification(message, 'is-danger');
  }

  function showSuccess(message) {
    showNotification(message, 'is-success');
  }

  function showInlineNote(message) {
    const noteEl = document.getElementById('editor-inline-note');
    if (noteEl) {
      noteEl.textContent = message;
      noteEl.classList.remove('is-hidden');
      setTimeout(() => noteEl.classList.add('is-hidden'), 3000);
    }
  }

  function showNotification(message, type = 'is-info') {
    const existing = document.getElementById('editor-notification');
    if (existing) existing.remove();

    const notification = document.createElement('div');
    notification.id = 'editor-notification';
    notification.className = `notification ${type}`;
    notification.style.cssText = 'position:fixed;top:20px;right:20px;z-index:9999;max-width:400px;';
    notification.innerHTML = `
      <button class="delete" aria-label="Close"></button>
      ${message}
    `;

    notification.querySelector('.delete').addEventListener('click', () => notification.remove());
    document.body.appendChild(notification);

    setTimeout(() => {
      if (notification.parentNode) notification.remove();
    }, 4000);
  }

  document.addEventListener('DOMContentLoaded', init);
})();