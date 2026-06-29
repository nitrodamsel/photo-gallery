/**
 * Drag-and-drop upload with XMLHttpRequest for progress tracking
 * Updates progress bar, shows thumbnail preview on completion,
 * appends success/error messages.
 */

(function () {
  'use strict';

  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('fileInput');
  const uploadForm = document.getElementById('uploadForm');
  const progressContainer = document.getElementById('progressContainer');
  const progressBar = document.getElementById('uploadProgressBar');
  const progressText = document.getElementById('progressText');
  const uploadStatus = document.getElementById('uploadStatus');
  const previewContainer = document.getElementById('previewContainer');
  const selectFilesBtn = document.getElementById('selectFilesBtn');

  // ─── Drag and Drop ──────────────────────────────────────────────────────

  if (dropZone) {
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      dropZone.addEventListener(eventName, preventDefaults, false);
      document.body.addEventListener(eventName, preventDefaults, false);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
      dropZone.addEventListener(eventName, () => {
        dropZone.classList.add('drag-active');
      });
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropZone.addEventListener(eventName, () => {
        dropZone.classList.remove('drag-active');
      });
    });

    dropZone.addEventListener('drop', function (e) {
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFiles(files);
      }
    });

    dropZone.addEventListener('click', function () {
      if (fileInput) fileInput.click();
    });
  }

  if (selectFilesBtn && fileInput) {
    selectFilesBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      fileInput.click();
    });
  }

  if (fileInput) {
    fileInput.addEventListener('change', function () {
      if (this.files.length > 0) {
        handleFiles(this.files);
      }
    });
  }

  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  // ─── File Handling ────────────────────────────────────────────────────────

  function handleFiles(files) {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const maxSize = 10 * 1024 * 1024; // 10 MB

    Array.from(files).forEach(file => {
      if (!validTypes.includes(file.type)) {
        showUploadMessage(`"${file.name}" is not a supported image type.`, 'danger');
        return;
      }
      if (file.size > maxSize) {
        showUploadMessage(`"${file.name}" exceeds the 10 MB size limit.`, 'danger');
        return;
      }
      uploadFile(file);
    });
  }

  // ─── Upload via XHR ───────────────────────────────────────────────────────

  function uploadFile(file) {
    const formData = new FormData();
    formData.append('image', file);

    // Copy other form fields if present
    if (uploadForm) {
      const titleInput = uploadForm.querySelector('#imageTitle');
      const descInput = uploadForm.querySelector('#imageDescription');
      if (titleInput && titleInput.value) formData.append('title', titleInput.value);
      if (descInput && descInput.value) formData.append('description', descInput.value);
    }

    const xhr = new XMLHttpRequest();

    // Show progress container
    showProgress(0, file.name);

    xhr.upload.addEventListener('progress', function (e) {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100);
        updateProgress(percent, file.name);
      }
    });

    xhr.addEventListener('load', function () {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          updateProgress(100, file.name);

          // Show thumbnail preview
          if (response.image) {
            showThumbnailPreview(response.image, file.name);
          }

          showUploadMessage(
            `<i class="bi bi-check-circle-fill me-1"></i>"${escapeHtml(file.name)}" uploaded successfully!` +
            (response.image ? ` <a href="/images/${response.image.id}" class="alert-link">View image</a>` : ''),
            'success'
          );

          // Reset form after successful upload
          if (uploadForm) {
            const titleInput = uploadForm.querySelector('#imageTitle');
            const descInput = uploadForm.querySelector('#imageDescription');
            if (titleInput) titleInput.value = '';
            if (descInput) descInput.value = '';
            if (fileInput) fileInput.value = '';
          }
        } catch (e) {
          showUploadMessage(`Upload succeeded but response parsing failed.`, 'warning');
        }

        hideProgressDelayed();
      } else {
        let errorMsg = 'Upload failed.';
        try {
          const errData = JSON.parse(xhr.responseText);
          errorMsg = errData.error || errData.message || errorMsg;
        } catch (e) { /* ignore */ }
        showUploadMessage(`<i class="bi bi-x-circle-fill me-1"></i>Error uploading "${escapeHtml(file.name)}": ${escapeHtml(errorMsg)}`, 'danger');
        hideProgressDelayed();
      }
    });

    xhr.addEventListener('error', function () {
      showUploadMessage(`<i class="bi bi-x-circle-fill me-1"></i>Network error while uploading "${escapeHtml(file.name)}".`, 'danger');
      hideProgressDelayed();
    });

    xhr.addEventListener('abort', function () {
      showUploadMessage(`Upload of "${escapeHtml(file.name)}" was cancelled.`, 'warning');
      hideProgressDelayed();
    });

    xhr.open('POST', '/upload', true);
    xhr.setRequestHeader('Accept', 'application/json');
    xhr.send(formData);
  }

  // ─── Progress UI ─────────────────────────────────────────────────────────

  function showProgress(percent, filename) {
    if (!progressContainer) return;
    progressContainer.classList.remove('d-none');
    updateProgress(percent, filename);
  }

  function updateProgress(percent, filename) {
    if (!progressBar) return;
    progressBar.style.width = `${percent}%`;
    progressBar.setAttribute('aria-valuenow', percent);
    progressBar.textContent = `${percent}%`;

    if (progressText) {
      progressText.textContent = percent < 100
        ? `Uploading "${filename}"... ${percent}%`
        : `Processing "${filename}"...`;
    }
  }

  function hideProgressDelayed() {
    setTimeout(() => {
      if (progressContainer) progressContainer.classList.add('d-none');
      if (progressBar) {
        progressBar.style.width = '0%';
        progressBar.textContent = '0%';
      }
    }, 2000);
  }

  // ─── Messages & Preview ────────────────────────────────────────────────

  function showUploadMessage(html, type) {
    if (!uploadStatus) return;
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} alert-dismissible fade show`;
    alert.innerHTML = `
      ${html}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    uploadStatus.appendChild(alert);

    // Auto-dismiss success messages
    if (type === 'success') {
      setTimeout(() => {
        alert.classList.remove('show');
        setTimeout(() => alert.remove(), 300);
      }, 8000);
    }
  }

  function showThumbnailPreview(image, filename) {
    if (!previewContainer) return;

    const thumbnailUrl = image.thumbnailPath
      ? `/uploads/${image.thumbnailPath.split('/').pop()}`
      : (image.filename ? `/uploads/${image.filename}` : null);

    if (!thumbnailUrl) return;

    const col = document.createElement('div');
    col.className = 'col-6 col-md-3 col-lg-2 mb-3';
    col.innerHTML = `
      <a href="/images/${image.id}" class="text-decoration-none">
        <div class="card h-100 shadow-sm preview-card">
          <img src="${escapeHtml(thumbnailUrl)}" 
               alt="${escapeHtml(image.title || filename)}"
               class="card-img-top"
               style="height: 100px; object-fit: cover;">
          <div class="card-body p-2">
            <p class="card-text small text-truncate mb-0" title="${escapeHtml(image.title || filename)}">
              ${escapeHtml(image.title || filename)}
            </p>
          </div>
        </div>
      </a>
    `;

    previewContainer.appendChild(col);
    previewContainer.classList.remove('d-none');
  }

  function escapeHtml(str) {
    if (typeof str !== 'string') return String(str || '');
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  // ─── Form Submit Fallback ────────────────────────────────────────────────

  if (uploadForm) {
    uploadForm.addEventListener('submit', function (e) {
      // If files are selected via input, use XHR instead of form submit
      if (fileInput && fileInput.files.length > 0) {
        e.preventDefault();
        handleFiles(fileInput.files);
      }
      // Otherwise let the form submit normally
    });
  }
})();