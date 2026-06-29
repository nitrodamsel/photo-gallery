/**
 * Drag-and-drop upload with XMLHttpRequest for progress tracking.
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
  const messageContainer = document.getElementById('uploadMessages');
  const previewContainer = document.getElementById('previewContainer');
  const selectFilesBtn = document.getElementById('selectFilesBtn');

  if (!dropZone && !uploadForm) return;

  // ── File Selection via Button ──────────────────────────────────────────────

  if (selectFilesBtn && fileInput) {
    selectFilesBtn.addEventListener('click', () => fileInput.click());
  }

  if (fileInput) {
    fileInput.addEventListener('change', function () {
      if (this.files && this.files.length > 0) {
        showSelectedFiles(Array.from(this.files));
      }
    });
  }

  // ── Drag & Drop ───────────────────────────────────────────────────────────

  if (dropZone) {
    ['dragenter', 'dragover'].forEach(evt => {
      dropZone.addEventListener(evt, e => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.add('drag-over');
      });
    });

    ['dragleave', 'drop'].forEach(evt => {
      dropZone.addEventListener(evt, e => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove('drag-over');
      });
    });

    dropZone.addEventListener('drop', function (e) {
      const files = Array.from(e.dataTransfer.files).filter(f =>
        f.type.startsWith('image/')
      );

      if (files.length === 0) {
        appendMessage('Please drop image files only.', 'danger');
        return;
      }

      if (fileInput) {
        // Assign dropped files to input
        const dt = new DataTransfer();
        files.forEach(f => dt.items.add(f));
        fileInput.files = dt.files;
      }

      showSelectedFiles(files);
    });

    // Click on drop zone opens file picker
    dropZone.addEventListener('click', function (e) {
      if (e.target === dropZone || e.target.closest('.drop-zone-inner')) {
        if (fileInput) fileInput.click();
      }
    });
  }

  // ── Form Submission ───────────────────────────────────────────────────────

  if (uploadForm) {
    uploadForm.addEventListener('submit', function (e) {
      e.preventDefault();

      if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
        appendMessage('Please select at least one image to upload.', 'warning');
        return;
      }

      const files = Array.from(fileInput.files);
      uploadFiles(files, uploadForm);
    });
  }

  // ── Preview Selected Files ────────────────────────────────────────────────

  function showSelectedFiles(files) {
    if (!previewContainer) return;
    previewContainer.innerHTML = '';
    previewContainer.classList.remove('d-none');

    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = function (e) {
        const col = document.createElement('div');
        col.className = 'col-4 col-md-3 col-lg-2';
        col.innerHTML = `
          <div class="card h-100 shadow-sm">
            <img src="${e.target.result}" class="card-img-top" alt="${escapeHtml(file.name)}"
                 style="height:100px;object-fit:cover;">
            <div class="card-body p-1">
              <p class="card-text small text-truncate mb-0" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</p>
              <p class="card-text small text-muted">${formatBytes(file.size)}</p>
            </div>
          </div>`;
        previewContainer.appendChild(col);
      };
      reader.readAsDataURL(file);
    });
  }

  // ── XHR Upload ────────────────────────────────────────────────────────────

  function uploadFiles(files, form) {
    const formData = new FormData(form);

    // Ensure all files are included (in case of multi-file)
    // Remove existing 'images' entries to avoid duplicates
    formData.delete('images');
    files.forEach(f => formData.append('images', f));

    showProgress(0);
    clearMessages();

    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', function (e) {
      if (e.lengthComputable) {
        const pct = Math.round((e.loaded / e.total) * 100);
        updateProgress(pct);
      }
    });

    xhr.upload.addEventListener('load', function () {
      updateProgress(100);
      if (progressText) progressText.textContent = 'Processing...';
    });

    xhr.addEventListener('load', function () {
      hideProgress();
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) {
          const count = data.uploaded ? data.uploaded.length : 1;
          appendMessage(
            `<i class="bi bi-check-circle-fill me-2"></i>Successfully uploaded ${count} image${count !== 1 ? 's' : ''}.`,
            'success'
          );

          // Show uploaded thumbnails
          if (data.uploaded && data.uploaded.length > 0 && previewContainer) {
            previewContainer.innerHTML = '';
            previewContainer.classList.remove('d-none');
            data.uploaded.forEach(img => {
              const col = document.createElement('div');
              col.className = 'col-4 col-md-3 col-lg-2';
              col.innerHTML = `
                <div class="card h-100 shadow-sm border-success">
                  <img src="/uploads/${escapeHtml(img.filename || img.storedName || img.path)}"
                       class="card-img-top" alt="${escapeHtml(img.originalName || img.filename || '')}"
                       style="height:100px;object-fit:cover;"
                       onerror="this.src='/img/placeholder.png'">
                  <div class="card-body p-1">
                    <p class="card-text small text-truncate mb-0">${escapeHtml(img.originalName || img.filename || '')}</p>
                    <a href="/gallery/${img.id}" class="btn btn-sm btn-outline-primary mt-1 w-100">View</a>
                  </div>
                </div>`;
              previewContainer.appendChild(col);
            });
          }

          // Reset form after delay
          setTimeout(() => {
            if (form) form.reset();
          }, 2000);
        } else {
          appendMessage(
            `<i class="bi bi-exclamation-triangle-fill me-2"></i>${data.error || 'Upload failed.'}`,
            'danger'
          );
        }
      } catch (err) {
        appendMessage(
          `<i class="bi bi-exclamation-triangle-fill me-2"></i>Upload failed: unexpected response.`,
          'danger'
        );
      }
    });

    xhr.addEventListener('error', function () {
      hideProgress();
      appendMessage(
        '<i class="bi bi-wifi-off me-2"></i>Network error. Please check your connection and try again.',
        'danger'
      );
    });

    xhr.addEventListener('abort', function () {
      hideProgress();
      appendMessage('Upload cancelled.', 'warning');
    });

    xhr.open('POST', form.action || '/upload', true);
    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    xhr.send(formData);
  }

  // ── Progress Helpers ──────────────────────────────────────────────────────

  function showProgress(pct) {
    if (!progressContainer) return;
    progressContainer.classList.remove('d-none');
    updateProgress(pct);
  }

  function updateProgress(pct) {
    if (progressBar) {
      progressBar.style.width = `${pct}%`;
      progressBar.setAttribute('aria-valuenow', pct);
    }
    if (progressText) {
      progressText.textContent = pct < 100 ? `Uploading... ${pct}%` : 'Upload complete!';
    }
  }

  function hideProgress() {
    if (progressContainer) {
      setTimeout(() => progressContainer.classList.add('d-none'), 1500);
    }
  }

  // ── Message Helpers ───────────────────────────────────────────────────────

  function appendMessage(html, type = 'info') {
    if (!messageContainer) return;
    const div = document.createElement('div');
    div.className = `alert alert-${type} alert-dismissible fade show`;
    div.innerHTML = `${html}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>`;
    messageContainer.appendChild(div);
    messageContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function clearMessages() {
    if (messageContainer) messageContainer.innerHTML = '';
  }

  // ── Utilities ─────────────────────────────────────────────────────────────

  function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
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
});