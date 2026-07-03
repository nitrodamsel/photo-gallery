/**
 * Image Editor — Client JS for the detail page edit panel.
 * Handles toggle show/hide, form data collection, PATCH via fetch,
 * and live CSS transform preview for rotation.
 */
(function () {
  'use strict';

  let currentRotation = 0;
  let editPanel;
  let mainImage;
  let imageId;

  function init() {
    editPanel = document.getElementById('edit-panel');
    mainImage = document.getElementById('main-image');
    const rotationInput = document.getElementById('edit-rotation');

    if (!editPanel) return; // Not on detail page

    imageId = editPanel.dataset.imageId;
    currentRotation = parseInt(rotationInput ? rotationInput.value : 0, 10) || 0;

    // Toggle button
    const toggleBtn = document.getElementById('edit-toggle-btn');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', toggleEditPanel);
    }

    // Cancel button
    const cancelBtn = document.getElementById('edit-cancel-btn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', closeEditPanel);
    }

    // Save button
    const saveBtn = document.getElementById('edit-save-btn');
    if (saveBtn) {
      saveBtn.addEventListener('click', saveChanges);
    }

    // Delete button
    const deleteBtn = document.getElementById('image-delete-btn');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', deleteImage);
    }

    // Regenerate thumbnails button
    const regenBtn = document.getElementById('regenerate-thumbnails-btn');
    if (regenBtn) {
      regenBtn.addEventListener('click', regenerateThumbnails);
    }

    // Rotation buttons
    const rotateCWBtn = document.getElementById('rotate-cw-btn');
    const rotateCCWBtn = document.getElementById('rotate-ccw-btn');
    const flipHBtn = document.getElementById('flip-h-btn');

    if (rotateCWBtn) {
      rotateCWBtn.addEventListener('click', () => adjustRotation(90));
    }
    if (rotateCCWBtn) {
      rotateCCWBtn.addEventListener('click', () => adjustRotation(-90));
    }
    if (flipHBtn) {
      flipHBtn.addEventListener('click', handleFlipH);
    }

    // Update preview transform on load
    updateImagePreview();
  }

  function toggleEditPanel() {
    if (!editPanel) return;
    if (editPanel.classList.contains('is-open')) {
      closeEditPanel();
    } else {
      openEditPanel();
    }
  }

  function openEditPanel() {
    editPanel.classList.add('is-open');
    const toggleBtn = document.getElementById('edit-toggle-btn');
    if (toggleBtn) {
      toggleBtn.textContent = 'Close Editor';
      toggleBtn.classList.add('is-warning');
      toggleBtn.classList.remove('is-info');
    }
  }

  function closeEditPanel() {
    editPanel.classList.remove('is-open');
    const toggleBtn = document.getElementById('edit-toggle-btn');
    if (toggleBtn) {
      toggleBtn.textContent = 'Edit Image';
      toggleBtn.classList.remove('is-warning');
      toggleBtn.classList.add('is-info');
    }
    // Reset rotation preview to saved value
    const rotationInput = document.getElementById('edit-rotation');
    const savedRotation = parseInt(rotationInput ? rotationInput.dataset.savedValue || rotationInput.value : 0, 10) || 0;
    currentRotation = savedRotation;
    updateImagePreview();
  }

  function adjustRotation(delta) {
    currentRotation = ((currentRotation + delta) % 360 + 360) % 360;
    updateRotationInput();
    updateImagePreview();
  }

  function handleFlipH() {
    // For flip, we use a CSS scaleX(-1). Track it separately.
    if (mainImage) {
      const currentTransform = mainImage.style.transform || '';
      if (currentTransform.includes('scaleX(-1)')) {
        mainImage.style.transform = currentTransform.replace(' scaleX(-1)', '').replace('scaleX(-1)', '').trim();
      } else {
        mainImage.style.transform = currentTransform + ' scaleX(-1)';
      }
    }
  }

  function updateRotationInput() {
    const rotationInput = document.getElementById('edit-rotation');
    if (rotationInput) {
      rotationInput.value = currentRotation;
    }
    // Update the rotation display badge
    const rotationDisplay = document.getElementById('rotation-display');
    if (rotationDisplay) {
      rotationDisplay.textContent = `${currentRotation}°`;
    }
  }

  function updateImagePreview() {
    if (!mainImage) return;
    const existingTransform = mainImage.style.transform || '';
    const hasFlip = existingTransform.includes('scaleX(-1)');
    let transform = `rotate(${currentRotation}deg)`;
    if (hasFlip) transform += ' scaleX(-1)';
    mainImage.style.transform = transform;
    mainImage.style.transition = 'transform 0.3s ease';
  }

  async function saveChanges() {
    if (!imageId) return;

    const saveBtn = document.getElementById('edit-save-btn');
    const description = document.getElementById('edit-description');
    const rotationInput = document.getElementById('edit-rotation');
    const captionInput = document.getElementById('edit-caption');
    const locationInput = document.getElementById('edit-location');
    const dateTakenInput = document.getElementById('edit-date-taken');

    // Build manualExif object
    const manualExif = {};
    if (captionInput && captionInput.value.trim()) {
      manualExif.caption = captionInput.value.trim();
    }
    if (locationInput && locationInput.value.trim()) {
      manualExif.locationName = locationInput.value.trim();
    }
    if (dateTakenInput && dateTakenInput.value.trim()) {
      manualExif.dateTaken = dateTakenInput.value.trim();
    }

    const body = {
      description: description ? description.value : '',
      rotation: parseInt(rotationInput ? rotationInput.value : 0, 10) || 0,
      manualExif: Object.keys(manualExif).length > 0 ? manualExif : {}
    };

    if (saveBtn) {
      saveBtn.textContent = 'Saving...';
      saveBtn.disabled = true;
    }

    try {
      const response = await fetch(`/api/images/${imageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save changes');
      }

      // Update saved value markers
      if (rotationInput) {
        rotationInput.dataset.savedValue = body.rotation;
      }

      // Update the page DOM with new data
      updatePageDOM(data.image);

      // Apply actual rotation to the image src (force reload thumbnail)
      if (mainImage) {
        // Add cache-busting param to force browser to reload
        const src = mainImage.src.split('?')[0];
        mainImage.src = src + '?t=' + Date.now();
        // Reset CSS transform since actual rotation is now baked into the thumbnail
        mainImage.style.transform = '';
        currentRotation = body.rotation;
      }

      showNotification('Changes saved successfully!', 'is-success');
      closeEditPanel();
    } catch (err) {
      console.error('Save failed:', err);
      showNotification(`Error: ${err.message}`, 'is-danger');
    } finally {
      if (saveBtn) {
        saveBtn.textContent = 'Save Changes';
        saveBtn.disabled = false;
      }
    }
  }

  function updatePageDOM(image) {
    // Update description
    const descEl = document.getElementById('image-description-display');
    if (descEl && image.description !== undefined) {
      if (image.description) {
        descEl.textContent = image.description;
        descEl.classList.remove('is-hidden');
      } else {
        descEl.classList.add('is-hidden');
      }
    }

    // Update manual EXIF display if elements exist
    let manualExif = {};
    try {
      if (image.manualExif) {
        manualExif = typeof image.manualExif === 'string'
          ? JSON.parse(image.manualExif)
          : image.manualExif;
      }
    } catch (e) { /* ignore */ }

    const captionDisplay = document.getElementById('manual-caption-display');
    if (captionDisplay) {
      if (manualExif.caption) {
        captionDisplay.textContent = manualExif.caption;
        captionDisplay.closest('.manual-exif-row') && captionDisplay.closest('.manual-exif-row').classList.remove('is-hidden');
      } else {
        captionDisplay.closest('.manual-exif-row') && captionDisplay.closest('.manual-exif-row').classList.add('is-hidden');
      }
    }

    const locationDisplay = document.getElementById('manual-location-display');
    if (locationDisplay) {
      if (manualExif.locationName) {
        locationDisplay.textContent = manualExif.locationName;
        locationDisplay.closest('.manual-exif-row') && locationDisplay.closest('.manual-exif-row').classList.remove('is-hidden');
      } else {
        locationDisplay.closest('.manual-exif-row') && locationDisplay.closest('.manual-exif-row').classList.add('is-hidden');
      }
    }

    const dateTakenDisplay = document.getElementById('manual-date-taken-display');
    if (dateTakenDisplay) {
      if (manualExif.dateTaken) {
        dateTakenDisplay.textContent = manualExif.dateTaken;
        dateTakenDisplay.closest('.manual-exif-row') && dateTakenDisplay.closest('.manual-exif-row').classList.remove('is-hidden');
      } else {
        dateTakenDisplay.closest('.manual-exif-row') && dateTakenDisplay.closest('.manual-exif-row').classList.add('is-hidden');
      }
    }
  }

  async function deleteImage() {
    if (!imageId) return;
    if (!confirm('Are you sure you want to delete this image? This cannot be undone.')) return;

    const deleteBtn = document.getElementById('image-delete-btn');
    if (deleteBtn) {
      deleteBtn.textContent = 'Deleting...';
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

      showNotification('Image deleted. Redirecting...', 'is-success');
      setTimeout(() => {
        window.location.href = '/gallery';
      }, 1500);
    } catch (err) {
      console.error('Delete failed:', err);
      showNotification(`Error: ${err.message}`, 'is-danger');
      if (deleteBtn) {
        deleteBtn.textContent = 'Delete Image';
        deleteBtn.disabled = false;
      }
    }
  }

  async function regenerateThumbnails() {
    if (!imageId) return;
    const regenBtn = document.getElementById('regenerate-thumbnails-btn');

    if (regenBtn) {
      regenBtn.textContent = 'Regenerating...';
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

      showNotification('Thumbnails regenerated successfully!', 'is-success');

      // Reload the main image with cache-busting
      if (mainImage) {
        const src = mainImage.src.split('?')[0];
        mainImage.src = src + '?t=' + Date.now();
      }
    } catch (err) {
      console.error('Regenerate failed:', err);
      showNotification(`Error: ${err.message}`, 'is-danger');
    } finally {
      if (regenBtn) {
        regenBtn.textContent = 'Regenerate Thumbnails';
        regenBtn.disabled = false;
      }
    }
  }

  function showNotification(message, cssClass) {
    const existing = document.getElementById('editor-notification');
    if (existing) existing.remove();

    const notification = document.createElement('div');
    notification.id = 'editor-notification';
    notification.className = `notification ${cssClass} editor-notification`;
    notification.innerHTML = `<button class="delete"></button>${message}`;

    const deleteBtn = notification.querySelector('.delete');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => notification.remove());
    }

    // Insert at top of main content area or body
    const mainContent = document.querySelector('.image-detail-container') || document.body;
    mainContent.insertBefore(notification, mainContent.firstChild);

    setTimeout(() => {
      if (notification.parentNode) notification.remove();
    }, 5000);
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();