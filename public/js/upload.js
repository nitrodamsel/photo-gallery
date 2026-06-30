/**
 * upload.js - Drag-and-drop upload with XMLHttpRequest progress tracking
 * Updates progress bar, shows thumbnail preview on completion,
 * appends success/error messages.
 */

document.addEventListener('DOMContentLoaded', function () {
  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('fileInput');
  const uploadForm = document.getElementById('uploadForm');
  const progressContainer = document.getElementById('progressContainer');
  const progressBar = document.getElementById('uploadProgressBar');
  const progressText = document.getElementById('progressText');
  const previewContainer = document.getElementById('previewContainer');
  const messagesContainer = document.getElementById('uploadMessages');
  const submitBtn = document.getElementById('submitBtn');

  if (!dropZone || !fileInput) return;

  // ─── Drag and drop events ──────────────────────────────────────────────────

  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, preventDefaults, false);
    document.body.addEventListener(eventName, preventDefaults, false);
  });

  ['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => dropZone.classList.add('drag-over'), false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => dropZone.classList.remove('drag-over'), false);
  });

  dropZone.addEventListener('drop', function (e) {
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      fileInput.files = files;
      handleFileSelection(files);
    }
  });

  dropZone.addEventListener('click', function () {
    fileInput.click();
  });

  fileInput.addEventListener('change', function () {
    if (this.files.length > 0) {
      handleFileSelection(this.files);
    }
  });

  // ─── File selection preview ────────────────────────────────────────────────

  function handleFileSelection(files) {
    if (!previewContainer) return;
    previewContainer.innerHTML = '';

    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) {
        appendMessage('warning', `"${file.name}" is not an image file and will be skipped.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = function (e) {
        const col = document.createElement('div');
        col.className = 'col-6 col-md-4 col-lg-3';
        col.innerHTML = `
          <div class="card h-100">
            <img src="${e.target.result}" class="card-img-top object-fit-cover"
              style="height:120px;" alt="${escapeHtml(file.name)}">
            <div class="card-body p-2">
              <p class="card-text small text-truncate mb-0" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</p>
              <p class="card-text small text-muted">${formatFileSize(file.size)}</p>
            </div>
          </div>
        `;
        previewContainer.appendChild(col);
      };
      reader.readAsDataURL(file);
    });

    // Update drop zone text
    const dropText = dropZone.querySelector('.drop-zone-text');
    if (dropText) {
      const count = files.length;
      dropText.textContent = `${count} file${count !== 1 ? 's' : ''} selected`;
    }

    // Show submit button if hidden
    if (submitBtn) submitBtn.classList.remove('d-none');
  }

  // ─── Form submission with XHR ──────────────────────────────────────────────

  if (uploadForm) {
    uploadForm.addEventListener('submit', function (e) {
      e.preventDefault();

      if (!fileInput.files || fileInput.files.length === 0) {
        appendMessage('warning', 'Please select at least one image to upload.');
        return;
      }

      const formData = new FormData(uploadForm);
      const xhr = new XMLHttpRequest();

      // Show progress
      if (progressContainer) progressContainer.classList.remove('d-none');
      setProgress(0);

      // Disable submit
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Uploading...';
      }

      // Progress tracking
      xhr.upload.addEventListener('progress', function (e) {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 100);
          setProgress(pct);
        }
      });

      xhr.upload.addEventListener('loadstart', function () {
        setProgress(0);
        if (progressText) progressText.textContent = 'Starting upload...';
      });

      xhr.upload.addEventListener('load', function () {
        setProgress(100);
        if (progressText) progressText.textContent = 'Processing...';
      });

      // Response handling
      xhr.addEventListener('load', function () {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<i class="bi bi-cloud-upload me-2"></i>Upload';
        }

        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            handleUploadSuccess(response);
          } catch (parseErr) {
            // Non-JSON response – redirect if location header present
            const location = xhr.getResponseHeader('Location');
            if (location) {
              window.location.href = location;
            } else {
              appendMessage('success', 'Upload completed successfully!');
              uploadForm.reset();
              if (previewContainer) previewContainer.innerHTML = '';
            }
          }
        } else {
          try {
            const err = JSON.parse(xhr.responseText);
            appendMessage('danger', err.error || err.message || `Upload failed (${xhr.status})`);
          } catch {
            appendMessage('danger', `Upload failed with status ${xhr.status}`);
          }
        }

        if (progressContainer) {
          setTimeout(() => progressContainer.classList.add('d-none'), 2000);
        }
      });

      xhr.addEventListener('error', function () {
        appendMessage('danger', 'Network error. Please check your connection and try again.');
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<i class="bi bi-cloud-upload me-2"></i>Upload';
        }
        if (progressContainer) progressContainer.classList.add('d-none');
      });

      xhr.addEventListener('abort', function () {
        appendMessage('warning', 'Upload cancelled.');
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<i class="bi bi-cloud-upload me-2"></i>Upload';
        }
        if (progressContainer) progressContainer.classList.add('d-none');
      });

      xhr.open('POST', uploadForm.action || '/upload', true);
      xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
      xhr.send(formData);
    });
  }

  // ─── Success handler ───────────────────────────────────────────────────────

  function handleUploadSuccess(response) {
    // Support array of uploaded images or single
    const images = Array.isArray(response) ? response : (response.images || [response]);

    if (previewContainer) {
      previewContainer.innerHTML = '';

      images.forEach(img => {
        if (!img || !img.filename) return;
        const col = document.createElement('div');
        col.className = 'col-6 col-md-4 col-lg-3';
        col.innerHTML = `
          <div class="card h-100 border-success">
            <div class="position-relative">
              <img src="/uploads/${escapeHtml(img.filename)}"
                class="card-img-top object-fit-cover"
                style="height:120px;"
                alt="${escapeHtml(img.originalName || img.filename)}"
                onerror="this.src='/img/placeholder.png'">
              <span class="position-absolute top-0 end-0 m-1 badge bg-success">
                <i class="bi bi-check-lg"></i>
              </span>
            </div>
            <div class="card-body p-2">
              <p class="card-text small text-truncate mb-1"
                title="${escapeHtml(img.originalName || img.filename)}">
                ${escapeHtml(img.originalName || img.filename)}
              </p>
              ${img.id ? `<a href="/image/${img.id}" class="btn btn-outline-primary btn-sm w-100">View</a>` : ''}
            </div>
          </div>
        `;
        previewContainer.appendChild(col);
      });
    }

    const count = images.length;
    appendMessage('success', `Successfully uploaded ${count} image${count !== 1 ? 's' : ''}!`);

    // Reset form but keep previews visible
    uploadForm.reset();

    if (submitBtn) submitBtn.classList.add('d-none');
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  function setProgress(pct) {
    if (!progressBar) return;
    progressBar.style.width = `${pct}%`;
    progressBar.setAttribute('aria-valuenow', pct);
    if (progressText) progressText.textContent = `${pct}%`;
  }

  function appendMessage(type, message) {
    if (!messagesContainer) return;

    const alert = document.createElement('div');
    alert.className = `alert alert-${type} alert-dismissible fade show`;
    alert.innerHTML = `
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    messagesContainer.appendChild(alert);

    // Auto-dismiss after 8 seconds
    setTimeout(() => {
      alert.classList.remove('show');
      setTimeout(() => alert.remove(), 300);
    }, 8000);
  }

  function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }

  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
});