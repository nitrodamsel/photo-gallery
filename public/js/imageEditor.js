/**
 * Image Editor - handles the edit panel on the image detail page
 * Supports: description editing, manual EXIF overrides, non-destructive rotation
 */
(function () {
  'use strict';

  let currentRotation = 0;
  let originalRotation = 0;
  let imageId = null;

  function init() {
    const editToggleBtn = document.getElementById('editToggleBtn');
    const editPanel = document.getElementById('editPanel');
    const editForm = document.getElementById('editForm');
    const cancelEditBtn = document.getElementById('cancelEditBtn');
    const deleteImageBtn = document.getElementById('deleteImageBtn');
    const regenerateThumbsBtn = document.getElementById('regenerateThumbsBtn');

    if (!editToggleBtn || !editPanel) return;

    // Get image ID and initial rotation from the page
    imageId = editPanel.dataset.imageId;
    currentRotation = parseInt(editPanel.dataset.rotation || '0', 10);
    originalRotation = currentRotation;

    // Update live preview on init
    updateRotationPreview();
    updateRotationButtons();

    // Toggle edit panel
    editToggleBtn.addEventListener('click', () => {
      const isOpen = editPanel.classList.contains('edit-panel--open');
      if (isOpen) {
        closePanel();
      } else {
        openPanel();
      }
    });

    // Cancel button
    if (cancelEditBtn) {
      cancelEditBtn.addEventListener('click', () => {
        // Reset rotation to original
        currentRotation = originalRotation;
        updateRotationPreview();
        updateRotationButtons();
        closePanel();
      });
    }

    // Rotation buttons
    const rotateCWBtn = document.getElementById('rotateCWBtn');
    const rotateCCWBtn = document.getElementById('rotateCCWBtn');
    const flipHBtn = document.getElementById('flipHBtn');

    if (rotateCWBtn) {
      rotateCWBtn.addEventListener('click', () => {
        currentRotation = (currentRotation + 90) % 360;
        updateRotationPreview();
        updateRotationButtons();
      });
    }

    if (rotateCCWBtn) {
      rotateCCWBtn.addEventListener('click', () => {
        currentRotation = (currentRotation - 90 + 360) % 360;
        updateRotationPreview();
        updateRotationButtons();
      });
    }

    if (flipHBtn) {
      flipHBtn.addEventListener('click', () => {
        // Flip is represented as 180-degree rotation for simplicity
        // In a more advanced implementation, you'd store flipH separately
        currentRotation = (currentRotation + 180) % 360;
        updateRotationPreview();
        updateRotationButtons();
      });
    }

    // Save form
    if (editForm) {
      editForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveChanges();
      });
    }

    // Delete button
    if (deleteImageBtn) {
      deleteImageBtn.addEventListener('click', async () => {
        if (!confirm('Are you sure you want to delete this image? This action cannot be undone.')) {
          return;
        }
        await deleteImage();
      });
    }

    // Regenerate thumbnails button
    if (regenerateThumbsBtn) {
      regenerateThumbsBtn.addEventListener('click', async () => {
        await regenerateThumbnails();
      });
    }
  }

  function openPanel() {
    const editPanel = document.getElementById('editPanel');
    const editToggleBtn = document.getElementById('editToggleBtn');
    if (editPanel) {
      editPanel.classList.add('edit-panel--open');
    }
    if (editToggleBtn) {
      editToggleBtn.textContent = '✕ Close Editor';
      editToggleBtn.classList.add('btn--active');
    }
  }

  function closePanel() {
    const editPanel = document.getElementById('editPanel');
    const editToggleBtn = document.getElementById('editToggleBtn');
    if (editPanel) {
      editPanel.classList.remove('edit-panel--open');
    }
    if (editToggleBtn) {
      editToggleBtn.textContent = '✏️ Edit';
      editToggleBtn.classList.remove('btn--active');
    }
  }

  function updateRotationPreview() {
    const previewImg = document.getElementById('imagePreview');
    if (!previewImg) return;

    previewImg.style.transform = `rotate(${currentRotation}deg)`;

    // Add transition for smooth preview
    previewImg.style.transition = 'transform 0.3s ease';
  }

  function updateRotationButtons() {
    const rotationDisplay = document.getElementById('currentRotationDisplay');
    if (rotationDisplay) {
      rotationDisplay.textContent = `${currentRotation}°`;
    }

    // Highlight if changed from original
    const rotationSection = document.getElementById('rotationSection');
    if (rotationSection) {
      if (currentRotation !== originalRotation) {
        rotationSection.classList.add('rotation-changed');
      } else {
        rotationSection.classList.remove('rotation-changed');
      }
    }
  }

  async function saveChanges() {
    const saveBtn = document.getElementById('saveEditBtn');
    const statusEl = document.getElementById('editStatus');

    // Collect form data
    const description = document.getElementById('editDescription')?.value || '';
    const captionOverride = document.getElementById('editCaption')?.value || '';
    const locationOverride = document.getElementById('editLocation')?.value || '';
    const dateTakenOverride = document.getElementById('editDateTaken')?.value || '';

    const manualExif = {};
    if (captionOverride.trim()) manualExif.caption = captionOverride.trim();
    if (locationOverride.trim()) manualExif.locationName = locationOverride.trim();
    if (dateTakenOverride.trim()) manualExif.dateTaken = dateTakenOverride.trim();

    const payload = {
      description,
      rotation: currentRotation
    };

    if (Object.keys(manualExif).length > 0) {
      payload.manualExif = manualExif;
    }

    // Disable save button during request
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving...';
    }
    if (statusEl) {
      statusEl.textContent = '';
      statusEl.className = 'edit-status';
    }

    try {
      const response = await fetch(`/api/images/${imageId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save changes');
      }

      // Update the page DOM without reload
      updatePageWithResponse(data.image);

      // Update original rotation tracking
      originalRotation = currentRotation;
      updateRotationButtons();

      if (statusEl) {
        statusEl.textContent = '✓ Changes saved successfully!';
        statusEl.className = 'edit-status edit-status--success';
        setTimeout(() => {
          statusEl.textContent = '';
        }, 3000);
      }
    } catch (err) {
      console.error('Save error:', err);
      if (statusEl) {
        statusEl.textContent = `✗ Error: ${err.message}`;
        statusEl.className = 'edit-status edit-status--error';
      }
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Changes';
      }
    }
  }

  function updatePageWithResponse(image) {
    if (!image) return;

    // Update description on detail page
    const descriptionEl = document.getElementById('imageDescription');
    if (descriptionEl && image.description !== undefined) {
      if (image.description) {
        descriptionEl.textContent = image.description;
        descriptionEl.style.display = '';
      } else {
        descriptionEl.textContent = '';
      }
    }

    // Update caption in EXIF table if displayed
    if (image.manualExif) {
      const captionEl = document.getElementById('exifCaption');
      if (captionEl && image.manualExif.caption) {
        captionEl.textContent = image.manualExif.caption;
      }

      const locationEl = document.getElementById('exifLocationName');
      if (locationEl && image.manualExif.locationName) {
        locationEl.textContent = image.manualExif.locationName;
      }

      const dateTakenEl = document.getElementById('exifDateTaken');
      if (dateTakenEl && image.manualExif.dateTaken) {
        dateTakenEl.textContent = image.manualExif.dateTaken;
      }
    }

    // Update title if needed
    const pageTitleEl = document.getElementById('imageTitle');
    if (pageTitleEl && image.originalName) {
      pageTitleEl.textContent = image.originalName;
    }
  }

  async function deleteImage() {
    const deleteBtn = document.getElementById('deleteImageBtn');
    if (deleteBtn) {
      deleteBtn.disabled = true;
      deleteBtn.textContent = 'Deleting...';
    }

    try {
      const response = await fetch(`/api/images/${imageId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete image');
      }

      // Redirect to gallery after successful deletion
      window.location.href = '/gallery?deleted=1';
    } catch (err) {
      console.error('Delete error:', err);
      alert(`Failed to delete image: ${err.message}`);
      if (deleteBtn) {
        deleteBtn.disabled = false;
        deleteBtn.textContent = '🗑️ Delete Image';
      }
    }
  }

  async function regenerateThumbnails() {
    const regenBtn = document.getElementById('regenerateThumbsBtn');
    const statusEl = document.getElementById('editStatus');

    if (regenBtn) {
      regenBtn.disabled = true;
      regenBtn.textContent = 'Regenerating...';
    }

    try {
      const response = await fetch(`/api/images/${imageId}/regenerate-thumbnails`, {
        method: 'POST'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to regenerate thumbnails');
      }

      if (statusEl) {
        statusEl.textContent = '✓ Thumbnails regenerated! Refresh to see changes.';
        statusEl.className = 'edit-status edit-status--success';
        setTimeout(() => { statusEl.textContent = ''; }, 4000);
      }
    } catch (err) {
      console.error('Regenerate error:', err);
      if (statusEl) {
        statusEl.textContent = `✗ Error: ${err.message}`;
        statusEl.className = 'edit-status edit-status--error';
      }
    } finally {
      if (regenBtn) {
        regenBtn.disabled = false;
        regenBtn.textContent = '🔄 Regenerate Thumbnails';
      }
    }
  }

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();