/**
 * Image Editor - handles the edit panel on the image detail page
 */
(function () {
  'use strict';

  // Current state
  let currentRotation = 0;
  let originalRotation = 0;
  let imageId = null;
  let isOpen = false;

  // DOM references
  let editPanel = null;
  let editToggleBtn = null;
  let previewImg = null;

  function init() {
    editPanel = document.getElementById('edit-panel');
    editToggleBtn = document.getElementById('edit-toggle-btn');
    previewImg = document.getElementById('main-image');

    if (!editPanel) return;

    // Get image ID from data attribute
    imageId = editPanel.dataset.imageId;

    // Get initial rotation
    currentRotation = parseInt(editPanel.dataset.rotation || '0', 10);
    originalRotation = currentRotation;

    // Bind toggle button
    if (editToggleBtn) {
      editToggleBtn.addEventListener('click', togglePanel);
    }

    // Bind close button
    const closeBtn = document.getElementById('edit-panel-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', closePanel);
    }

    // Bind cancel button
    const cancelBtn = document.getElementById('edit-cancel-btn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', cancelEdit);
    }

    // Bind save button
    const saveBtn = document.getElementById('edit-save-btn');
    if (saveBtn) {
      saveBtn.addEventListener('click', saveChanges);
    }

    // Bind rotation buttons
    const rotateCWBtn = document.getElementById('rotate-cw-btn');
    const rotateCCWBtn = document.getElementById('rotate-ccw-btn');
    const flipHBtn = document.getElementById('flip-h-btn');

    if (rotateCWBtn) {
      rotateCWBtn.addEventListener('click', () => rotateImage(90));
    }
    if (rotateCCWBtn) {
      rotateCCWBtn.addEventListener('click', () => rotateImage(-90));
    }
    if (flipHBtn) {
      flipHBtn.addEventListener('click', flipHorizontal);
    }

    // Bind delete button
    const deleteBtn = document.getElementById('delete-image-btn');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', deleteImage);
    }

    // Bind regenerate thumbnails button
    const regenBtn = document.getElementById('regen-thumbnails-btn');
    if (regenBtn) {
      regenBtn.addEventListener('click', regenerateThumbnails);
    }

    // Update rotation display
    updateRotationDisplay();
  }

  function togglePanel() {
    if (isOpen) {
      closePanel();
    } else {
      openPanel();
    }
  }

  function openPanel() {
    if (!editPanel) return;
    editPanel.classList.add('edit-panel--open');
    isOpen = true;
    if (editToggleBtn) {
      editToggleBtn.classList.add('active');
      editToggleBtn.setAttribute('aria-expanded', 'true');
    }
  }

  function closePanel() {
    if (!editPanel) return;
    editPanel.classList.remove('edit-panel--open');
    isOpen = false;
    if (editToggleBtn) {
      editToggleBtn.classList.remove('active');
      editToggleBtn.setAttribute('aria-expanded', 'false');
    }
  }

  function cancelEdit() {
    // Revert rotation preview
    currentRotation = originalRotation;
    updateRotationDisplay();
    closePanel();
  }

  function rotateImage(degrees) {
    currentRotation = ((currentRotation + degrees) % 360 + 360) % 360;
    updateRotationDisplay();
  }

  function flipHorizontal() {
    // Flip is represented as 'flip' in the UI - for simplicity we toggle a flip state
    // In this implementation we'll note flip is handled as rotation 0 with scaleX(-1) preview
    // but the API doesn't currently support flip, so we just show a visual preview note
    if (previewImg) {
      const currentTransform = previewImg.style.transform || '';
      if (currentTransform.includes('scaleX(-1)')) {
        previewImg.style.transform = currentTransform.replace(' scaleX(-1)', '').replace('scaleX(-1)', '').trim();
      } else {
        previewImg.style.transform = (currentTransform + ' scaleX(-1)').trim();
      }
    }
  }

  function updateRotationDisplay() {
    // Update the live CSS preview on the main image
    if (previewImg) {
      // Preserve any existing scaleX transform
      const currentTransform = previewImg.style.transform || '';
      const hasFlip = currentTransform.includes('scaleX(-1)');
      const flipStr = hasFlip ? ' scaleX(-1)' : '';
      previewImg.style.transform = `rotate(${currentRotation}deg)${flipStr}`;
    }

    // Update rotation value display
    const rotationDisplay = document.getElementById('rotation-display');
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
    if (!imageId) return;

    const saveBtn = document.getElementById('edit-save-btn');
    const statusEl = document.getElementById('edit-status');

    // Gather form data
    const description = document.getElementById('edit-description')
      ? document.getElementById('edit-description').value
      : undefined;

    const manualExif = {
      caption: document.getElementById('edit-caption')
        ? document.getElementById('edit-caption').value
        : '',
      locationName: document.getElementById('edit-location')
        ? document.getElementById('edit-location').value
        : '',
      dateTaken: document.getElementById('edit-date-taken')
        ? document.getElementById('edit-date-taken').value
        : ''
    };

    // Remove empty values
    Object.keys(manualExif).forEach(key => {
      if (!manualExif[key]) delete manualExif[key];
    });

    const body = {
      description,
      manualExif: Object.keys(manualExif).length > 0 ? manualExif : undefined,
      rotation: currentRotation
    };

    // Remove undefined keys
    Object.keys(body).forEach(key => body[key] === undefined && delete body[key]);

    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving...';
    }

    setStatus('', '');

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

      // Update state
      originalRotation = data.image.rotation;
      currentRotation = originalRotation;

      // Update DOM without reload
      updateDetailPageDOM(data.image);

      setStatus('Changes saved successfully!', 'success');

      // Close panel after short delay
      setTimeout(() => {
        closePanel();
        setStatus('', '');
      }, 1500);

    } catch (err) {
      console.error('Save error:', err);
      setStatus(`Error: ${err.message}`, 'error');
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Changes';
      }
    }
  }

  function updateDetailPageDOM(imageData) {
    // Update description
    if (imageData.description !== undefined) {
      const descEl = document.getElementById('image-description');
      if (descEl) {
        descEl.textContent = imageData.description || '';
      }
    }

    // Update rotation in edit panel data attribute
    if (editPanel && imageData.rotation !== undefined) {
      editPanel.dataset.rotation = imageData.rotation;
    }

    // Update manual EXIF fields if displayed
    if (imageData.manualExif) {
      const exif = imageData.manualExif;

      if (exif.caption) {
        const captionEl = document.getElementById('display-caption');
        if (captionEl) captionEl.textContent = exif.caption;
      }

      if (exif.locationName) {
        const locationEl = document.getElementById('display-location');
        if (locationEl) locationEl.textContent = exif.locationName;
      }

      if (exif.dateTaken) {
        const dateEl = document.getElementById('display-date-taken');
        if (dateEl) dateEl.textContent = exif.dateTaken;
      }
    }

    // Update image src to bust cache if rotation changed
    if (previewImg && imageData.rotation !== undefined) {
      const src = previewImg.src;
      const baseUrl = src.split('?')[0];
      previewImg.src = `${baseUrl}?v=${Date.now()}`;
      // Reset the CSS transform since the actual image will have the rotation applied
      setTimeout(() => {
        previewImg.style.transform = '';
      }, 500);
    }
  }

  async function deleteImage() {
    if (!imageId) return;

    if (!confirm('Are you sure you want to delete this image? This action cannot be undone.')) {
      return;
    }

    const deleteBtn = document.getElementById('delete-image-btn');
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

      // Redirect to gallery
      window.location.href = '/gallery';

    } catch (err) {
      console.error('Delete error:', err);
      setStatus(`Error: ${err.message}`, 'error');
      if (deleteBtn) {
        deleteBtn.disabled = false;
        deleteBtn.textContent = 'Delete Image';
      }
    }
  }

  async function regenerateThumbnails() {
    if (!imageId) return;

    const regenBtn = document.getElementById('regen-thumbnails-btn');
    if (regenBtn) {
      regenBtn.disabled = true;
      regenBtn.textContent = 'Regenerating...';
    }

    setStatus('', '');

    try {
      const response = await fetch(`/api/images/${imageId}/regenerate-thumbnails`, {
        method: 'POST'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to regenerate thumbnails');
      }

      setStatus('Thumbnails regenerated successfully!', 'success');

    } catch (err) {
      console.error('Regen error:', err);
      setStatus(`Error: ${err.message}`, 'error');
    } finally {
      if (regenBtn) {
        regenBtn.disabled = false;
        regenBtn.textContent = 'Regenerate Thumbnails';
      }
    }
  }

  function setStatus(message, type) {
    const statusEl = document.getElementById('edit-status');
    if (!statusEl) return;

    statusEl.textContent = message;
    statusEl.className = 'edit-status';
    if (type) {
      statusEl.classList.add(`edit-status--${type}`);
    }
    statusEl.style.display = message ? 'block' : 'none';
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();