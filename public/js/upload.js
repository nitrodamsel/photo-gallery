/**
 * upload.js - Drag-and-drop file upload with progress tracking
 * Uses XMLHttpRequest for upload progress events.
 */

(function () {
  'use strict';

  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('fileInput');
  const uploadForm = document.getElementById('uploadForm');
  const progressContainer = document.getElementById('progressContainer');
  const progressBar = document.getElementById('uploadProgressBar');
  const progressText = document.getElementById('progressText');
  const previewContainer = document.getElementById('previewContainer');
  const uploadMessages = document.getElementById('uploadMessages');
  const browseBtn = document.getElementById('browseBtn');

  if (!dropZone || !fileInput) return;

  // ─── Browse Button ──────────────────────────────────────────────────────────
  if (browseBtn) {
    browseBtn.addEventListener('click', (e) => {
      e.preventDefault();
      fileInput.click();
    });
  }

  // ─── Drop Zone Events ───────────────────────────────────────────────────────
  ['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.add('drag-over');
    });
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove('drag-over');
    });
  });

  dropZone.addEventListener('drop', (e) => {
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFiles(files);
    }
  });

  dropZone.addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) {
      handleFiles(fileInput.files);
    }
  });

  // ─── File Handling ──────────────────────────────────────────────────────────

  function handleFiles(files) {
    // Filter to only accept images
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/tiff'];
    const validFiles = Array.from(files).filter(f => allowedTypes.includes(f.type));

    if (validFiles.length === 0) {
      showMessage('Please select valid image files (JPEG, PNG, GIF, WebP, TIFF).', 'danger');
      return;
    }

    if (validFiles.length !== files.length) {
      showMessage('Some files were skipped (unsupported format).', 'warning');
    }

    // Show preview for first file
    if (validFiles.length === 1) {
      showPreview(validFiles[0]);
    } else {
      showMultiplePreview(validFiles);
    }

    // Upload files one by one
    uploadFiles(validFiles);
  }

  function showPreview(file) {
    if (!previewContainer) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      previewContainer.innerHTML = `
        <div class="text-center">
          <p class="text-muted small mb-2">Preview:</p>
          <img
            src="${e.target.result}"
            alt="Preview"
            class="img-thumbnail"
            style="max-width: 200px; max-height: 150px; object-fit: cover;"
          />
          <p class="small text-muted mt-1 mb-0">${escapeHtml(file.name)} (${formatFileSize(file.size)})</p>
        </div>
      `;
    };
    reader.readAsDataURL(file);
  }

  function showMultiplePreview(files) {
    if (!previewContainer) return;
    previewContainer.innerHTML = `
      <p class="text-muted small mb-2">${files.length} files selected:</p>
      <ul class="list-unstyled small mb-0">
        ${files.map(f => `<li><i class="bi bi-image me-1 text-primary"></i>${escapeHtml(f.name)} <span class="text-muted">(${formatFileSize(f.size)})</span></li>`).join('')}
      </ul>
    `;
  }

  // ─── Upload Logic ───────────────────────────────────────────────────────────

  async function uploadFiles(files) {
    clearMessages();

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const label = files.length > 1 ? `File ${i + 1}/${files.length}: ${file.name}` : file.name;
      await uploadSingleFile(file, label);
    }
  }

  function uploadSingleFile(file, label) {
    return new Promise((resolve) => {
      const formData = new FormData();
      formData.append('image', file);

      // Grab other form fields if present
      if (uploadForm) {
        const titleInput = uploadForm.querySelector('[name="title"]');
        const descInput = uploadForm.querySelector('[name="description"]');
        const tagsInput = uploadForm.querySelector('[name="tags"]');
        const albumInput = uploadForm.querySelector('[name="album"]');

        if (titleInput && titleInput.value) formData.append('title', titleInput.value);
        if (descInput && descInput.value) formData.append('description', descInput.value);
        if (tagsInput && tagsInput.value) formData.append('tags', tagsInput.value);
        if (albumInput && albumInput.value) formData.append('album', albumInput.value);
      }

      showProgress(0, label);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/upload', true);

      // Progress tracking
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 100);
          showProgress(pct, label);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            // Try to parse JSON response
            const data = JSON.parse(xhr.responseText);
            showProgress(100, label);
            showMessage(
              `<i class="bi bi-check-circle-fill text-success me-1"></i>
               <strong>${escapeHtml(file.name)}</strong> uploaded successfully!
               ${data.image ? `<a href="/gallery/${data.image.id}" class="ms-2 btn btn-sm btn-outline-success">View Image</a>` : ''}`,
              'success'
            );
            if (data.image) {
              appendSuccessThumb(data.image);
            }
          } catch {
            // HTML response (redirect) — treat as success
            showProgress(100, label);
            showMessage(
              `<i class="bi bi-check-circle-fill text-success me-1"></i>
               <strong>${escapeHtml(file.name)}</strong> uploaded successfully!`,
              'success'
            );
          }
        } else {
          showProgress(0, label);
          let errorMsg = 'Upload failed.';
          try {
            const err = JSON.parse(xhr.responseText);
            errorMsg = err.error || err.message || errorMsg;
          } catch {}
          showMessage(
            `<i class="bi bi-exclamation-triangle-fill text-danger me-1"></i>
             <strong>${escapeHtml(file.name)}</strong>: ${escapeHtml(errorMsg)}`,
            'danger'
          );
        }
        hideProgressAfterDelay();
        resolve();
      });

      xhr.addEventListener('error', () => {
        showMessage(
          `<i class="bi bi-wifi-off me-1 text-danger"></i>
           Network error uploading <strong>${escapeHtml(file.name)}</strong>.`,
          'danger'
        );
        hideProgressAfterDelay();
        resolve();
      });

      xhr.addEventListener('abort', () => {
        showMessage(
          `<i class="bi bi-x-circle me-1 text-warning"></i>
           Upload of <strong>${escapeHtml(file.name)}</strong> was cancelled.`,
          'warning'
        );
        hideProgressAfterDelay();
        resolve();
      });

      xhr.send(formData);
    });
  }

  // ─── UI Helpers ─────────────────────────────────────────────────────────────

  function showProgress(percent, label) {
    if (!progressContainer || !progressBar) return;
    progressContainer.classList.remove('d-none');
    progressBar.style.width = percent + '%';
    progressBar.setAttribute('aria-valuenow', percent);
    progressBar.textContent = percent + '%';
    if (progressText) {
      progressText.textContent = label ? `Uploading: ${label}` : 'Uploading...';
    }

    if (percent === 100) {
      progressBar.classList.remove('progress-bar-animated');
      progressBar.classList.add('bg-success');
    } else {
      progressBar.classList.add('progress-bar-animated');
      progressBar.classList.remove('bg-success');
    }
  }

  function hideProgressAfterDelay() {
    setTimeout(() => {
      if (progressContainer) progressContainer.classList.add('d-none');
      if (progressBar) {
        progressBar.style.width = '0%';
        progressBar.textContent = '0%';
        progressBar.classList.remove('bg-success', 'progress-bar-animated');
      }
    }, 2000);
  }

  function showMessage(html, type) {
    if (!uploadMessages) return;
    const div = document.createElement('div');
    div.className = `alert alert-${type} alert-dismissible fade show py-2 mb-2`;
    div.innerHTML = html + '<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>';
    uploadMessages.appendChild(div);
  }

  function clearMessages() {
    if (uploadMessages) uploadMessages.innerHTML = '';
  }

  function appendSuccessThumb(image) {
    // Append a small thumbnail to the preview area after successful upload
    const thumbsContainer = document.getElementById('successThumbs');
    if (!thumbsContainer) return;

    const div = document.createElement('div');
    div.className = 'success-thumb d-inline-block m-1 text-center';
    div.innerHTML = `
      <a href="/gallery/${image.id}" title="${escapeHtml(image.title || image.filename)}">
        <img
          src="/uploads/${escapeHtml(image.filename)}"
          alt="${escapeHtml(image.title || image.filename)}"
          class="img-thumbnail"
          style="width: 80px; height: 80px; object-fit: cover;"
          onerror="this.src='/img/placeholder.png'"
        />
      </a>
    `;
    thumbsContainer.appendChild(div);
    thumbsContainer.classList.remove('d-none');
  }

  function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

})();