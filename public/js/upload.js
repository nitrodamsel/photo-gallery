/**
 * Drag-and-drop upload with XMLHttpRequest for progress tracking
 * Updates progress bar, shows thumbnail preview on completion,
 * appends success/error messages
 */

(function () {
  'use strict';

  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');
  const uploadForm = document.getElementById('upload-form');
  const progressContainer = document.getElementById('progress-container');
  const progressBar = document.getElementById('upload-progress-bar');
  const progressText = document.getElementById('progress-text');
  const previewContainer = document.getElementById('preview-container');
  const messageContainer = document.getElementById('upload-message');

  if (!dropZone && !uploadForm) return;

  // ─── Drag & Drop Events ──────────────────────────────────────────────────

  if (dropZone) {
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      dropZone.addEventListener(eventName, preventDefaults, false);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
      dropZone.addEventListener(eventName, () => {
        dropZone.classList.add('drop-zone-active');
      });
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropZone.addEventListener(eventName, () => {
        dropZone.classList.remove('drop-zone-active');
      });
    });

    dropZone.addEventListener('drop', function (e) {
      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        handleFiles(files);
      }
    });

    dropZone.addEventListener('click', function () {
      if (fileInput) fileInput.click();
    });
  }

  if (fileInput) {
    fileInput.addEventListener('change', function () {
      if (this.files && this.files.length > 0) {
        handleFiles(this.files);
      }
    });
  }

  if (uploadForm) {
    uploadForm.addEventListener('submit', function (e) {
      // If using the traditional form submit (no drag-drop), allow it
      // But intercept for XHR if files are selected
      if (fileInput && fileInput.files && fileInput.files.length > 0) {
        e.preventDefault();
        handleFiles(fileInput.files);
      }
    });
  }

  // ─── Handle Files ────────────────────────────────────────────────────────

  function handleFiles(files) {
    clearMessages();

    Array.from(files).forEach(file => {
      if (!isValidImageFile(file)) {
        showMessage(`"${file.name}" is not a supported image format (JPEG, PNG, GIF, WebP).`, 'danger');
        return;
      }
      uploadFile(file);
    });
  }

  function isValidImageFile(file) {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    return allowedTypes.includes(file.type.toLowerCase());
  }

  // ─── Upload via XHR ──────────────────────────────────────────────────────

  function uploadFile(file) {
    const formData = new FormData();
    formData.append('image', file);

    // Copy other form fields if present
    if (uploadForm) {
      const titleInput = uploadForm.querySelector('[name="title"]');
      const descInput = uploadForm.querySelector('[name="description"]');
      const tagsInput = uploadForm.querySelector('[name="tags"]');
      if (titleInput) formData.append('title', titleInput.value);
      if (descInput) formData.append('description', descInput.value);
      if (tagsInput) formData.append('tags', tagsInput.value);
    }

    // Show preview immediately
    showPreview(file);

    // Show progress container
    if (progressContainer) progressContainer.style.display = 'block';
    setProgress(0);

    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', function (e) {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100);
        setProgress(percent);
      }
    });

    xhr.addEventListener('load', function () {
      if (xhr.status >= 200 && xhr.status < 300) {
        setProgress(100);
        let data;
        try {
          data = JSON.parse(xhr.responseText);
        } catch (err) {
          // Non-JSON response — redirect
          showMessage(`"${file.name}" uploaded successfully!`, 'success');
          setTimeout(() => { window.location.href = '/gallery'; }, 1500);
          return;
        }

        if (data.redirect) {
          showMessage(`"${file.name}" uploaded successfully!`, 'success');
          updatePreviewWithLink(file.name, data.redirect, data.thumbnailUrl);
          setTimeout(() => { window.location.href = data.redirect; }, 2000);
        } else {
          showMessage(`"${file.name}" uploaded successfully!`, 'success');
        }
      } else {
        setProgress(0);
        if (progressContainer) progressContainer.style.display = 'none';
        let errorMsg = `Failed to upload "${file.name}".`;
        try {
          const data = JSON.parse(xhr.responseText);
          if (data.error) errorMsg = data.error;
        } catch (e) { /* ignore */ }
        showMessage(errorMsg, 'danger');
      }
    });

    xhr.addEventListener('error', function () {
      setProgress(0);
      if (progressContainer) progressContainer.style.display = 'none';
      showMessage(`Network error uploading "${file.name}". Please try again.`, 'danger');
    });

    xhr.addEventListener('abort', function () {
      setProgress(0);
      if (progressContainer) progressContainer.style.display = 'none';
      showMessage(`Upload of "${file.name}" was cancelled.`, 'warning');
    });

    xhr.open('POST', '/upload', true);
    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    xhr.send(formData);
  }

  // ─── Progress Bar ─────────────────────────────────────────────────────────

  function setProgress(percent) {
    if (progressBar) {
      progressBar.style.width = `${percent}%`;
      progressBar.setAttribute('aria-valuenow', percent);
    }
    if (progressText) {
      progressText.textContent = `${percent}%`;
    }
  }

  // ─── Preview ──────────────────────────────────────────────────────────────

  function showPreview(file) {
    if (!previewContainer) return;

    const reader = new FileReader();
    reader.onload = function (e) {
      const wrapper = document.createElement('div');
      wrapper.className = 'upload-preview-item me-2 mb-2 d-inline-block position-relative';
      wrapper.setAttribute('data-filename', file.name);

      const img = document.createElement('img');
      img.src = e.target.result;
      img.className = 'img-thumbnail';
      img.style.width = '120px';
      img.style.height = '120px';
      img.style.objectFit = 'cover';
      img.alt = file.name;

      const label = document.createElement('div');
      label.className = 'text-truncate small text-center mt-1';
      label.style.maxWidth = '120px';
      label.textContent = file.name;

      const spinner = document.createElement('div');
      spinner.className = 'position-absolute top-0 end-0 p-1';
      spinner.id = `spinner-${sanitizeId(file.name)}`;
      spinner.innerHTML = '<div class="spinner-border spinner-border-sm text-primary" role="status"><span class="visually-hidden">Uploading...</span></div>';

      wrapper.appendChild(img);
      wrapper.appendChild(spinner);
      wrapper.appendChild(label);
      previewContainer.appendChild(wrapper);
    };
    reader.readAsDataURL(file);
  }

  function updatePreviewWithLink(fileName, href, thumbnailUrl) {
    const wrapper = document.querySelector(`.upload-preview-item[data-filename="${fileName}"]`);
    if (!wrapper) return;

    const spinnerId = `spinner-${sanitizeId(fileName)}`;
    const spinner = document.getElementById(spinnerId);
    if (spinner) spinner.remove();

    // Show success checkmark
    const check = document.createElement('div');
    check.className = 'position-absolute top-0 end-0 p-1';
    check.innerHTML = '<i class="bi bi-check-circle-fill text-success fs-5"></i>';
    wrapper.appendChild(check);

    // Update thumbnail if provided
    if (thumbnailUrl) {
      const img = wrapper.querySelector('img');
      if (img) img.src = thumbnailUrl;
    }

    // Wrap in link
    if (href) {
      wrapper.style.cursor = 'pointer';
      wrapper.addEventListener('click', () => { window.location.href = href; });
    }
  }

  // ─── Messages ─────────────────────────────────────────────────────────────

  function showMessage(message, type) {
    if (!messageContainer) return;

    const alert = document.createElement('div');
    alert.className = `alert alert-${type} alert-dismissible fade show`;
    alert.role = 'alert';
    alert.innerHTML = `
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    messageContainer.appendChild(alert);
  }

  function clearMessages() {
    if (messageContainer) messageContainer.innerHTML = '';
    if (previewContainer) previewContainer.innerHTML = '';
    if (progressContainer) progressContainer.style.display = 'none';
    setProgress(0);
  }

  // ─── Utilities ────────────────────────────────────────────────────────────

  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  function sanitizeId(str) {
    return str.replace(/[^a-zA-Z0-9]/g, '_');
  }

})();