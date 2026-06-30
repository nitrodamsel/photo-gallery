/**
 * upload.js — Drag-and-drop upload with XMLHttpRequest for progress tracking
 * Updates progress bar, shows thumbnail preview on completion,
 * appends success/error message
 */

document.addEventListener('DOMContentLoaded', function () {
  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('fileInput');
  const uploadForm = document.getElementById('uploadForm');
  const progressContainer = document.getElementById('progressContainer');
  const progressBar = document.getElementById('uploadProgressBar');
  const previewContainer = document.getElementById('previewContainer');
  const messageContainer = document.getElementById('uploadMessage');
  const submitBtn = document.getElementById('submitBtn');

  if (!dropZone || !fileInput) return;

  // ── Drag & Drop events ──────────────────────────────

  dropZone.addEventListener('dragover', function (e) {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.add('drag-over');
  });

  dropZone.addEventListener('dragleave', function (e) {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove('drag-over');
  });

  dropZone.addEventListener('drop', function (e) {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove('drag-over');

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      fileInput.files = files;
      handleFileSelection(files[0]);
    }
  });

  dropZone.addEventListener('click', function () {
    fileInput.click();
  });

  fileInput.addEventListener('change', function () {
    if (this.files && this.files[0]) {
      handleFileSelection(this.files[0]);
    }
  });

  // ── File selection preview ──────────────────────────

  function handleFileSelection(file) {
    if (!file.type.startsWith('image/')) {
      showMessage('danger', 'Please select a valid image file.');
      return;
    }

    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      showMessage('danger', 'File is too large. Maximum size is 50MB.');
      return;
    }

    // Show preview
    if (previewContainer) {
      const reader = new FileReader();
      reader.onload = function (e) {
        previewContainer.innerHTML = `
          <div class="mt-3">
            <p class="text-muted small mb-1">Selected: <strong>${escapeHtml(file.name)}</strong> (${formatFileSize(file.size)})</p>
            <img src="${e.target.result}" alt="Preview" class="img-thumbnail" style="max-height: 200px; max-width: 100%;">
          </div>
        `;
      };
      reader.readAsDataURL(file);
    }

    // Update drop zone label
    const dropLabel = dropZone.querySelector('.drop-label');
    if (dropLabel) {
      dropLabel.textContent = file.name;
    }
  }

  // ── Form submission with XHR ────────────────────────

  if (uploadForm) {
    uploadForm.addEventListener('submit', function (e) {
      e.preventDefault();

      if (!fileInput.files || fileInput.files.length === 0) {
        showMessage('danger', 'Please select a file to upload.');
        return;
      }

      const file = fileInput.files[0];
      if (!file.type.startsWith('image/')) {
        showMessage('danger', 'Please select a valid image file.');
        return;
      }

      const formData = new FormData(uploadForm);

      // Disable submit button
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Uploading...';
      }

      // Show progress bar
      if (progressContainer) progressContainer.classList.remove('d-none');
      setProgress(0);

      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener('progress', function (e) {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 100);
          setProgress(pct);
        }
      });

      xhr.upload.addEventListener('load', function () {
        setProgress(100);
      });

      xhr.addEventListener('load', function () {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<i class="bi bi-cloud-upload me-2"></i>Upload';
        }

        if (xhr.status >= 200 && xhr.status < 300) {
          let data = {};
          try {
            data = JSON.parse(xhr.responseText);
          } catch (e) {
            // Non-JSON response — treat as success if status was 2xx
          }

          // Show success thumbnail if available
          if (previewContainer && data.image) {
            const thumbSrc = data.image.thumbnailPath
              ? `/uploads/${data.image.thumbnailPath}`
              : (data.image.filename ? `/uploads/${data.image.filename}` : null);

            if (thumbSrc) {
              previewContainer.innerHTML = `
                <div class="mt-3 text-center">
                  <img src="${escapeHtml(thumbSrc)}" alt="Uploaded image" class="img-thumbnail shadow-sm" style="max-height: 200px;">
                  <p class="mt-2 mb-0 small text-success fw-semibold">
                    <i class="bi bi-check-circle me-1"></i>Upload complete!
                  </p>
                </div>
              `;
            }
          }

          const imageId = data.image && data.image.id;
          const detailUrl = imageId ? `/image/${imageId}` : '/gallery';

          showMessage('success', `
            <i class="bi bi-check-circle-fill me-2"></i>
            Image uploaded successfully!
            <a href="${escapeHtml(detailUrl)}" class="alert-link ms-2">View image</a> |
            <a href="/upload" class="alert-link ms-1">Upload another</a>
          `);

          // Reset form
          uploadForm.reset();
          if (dropZone) {
            const dropLabel = dropZone.querySelector('.drop-label');
            if (dropLabel) dropLabel.textContent = 'Click to select or drag & drop an image here';
          }
          if (progressContainer) {
            setTimeout(() => progressContainer.classList.add('d-none'), 2000);
          }

        } else {
          let errMsg = 'Upload failed.';
          try {
            const data = JSON.parse(xhr.responseText);
            if (data.error) errMsg = data.error;
            else if (data.message) errMsg = data.message;
          } catch (e) {}
          showMessage('danger', `<i class="bi bi-exclamation-triangle-fill me-2"></i>${escapeHtml(errMsg)}`);
          if (progressContainer) progressContainer.classList.add('d-none');
        }
      });

      xhr.addEventListener('error', function () {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<i class="bi bi-cloud-upload me-2"></i>Upload';
        }
        showMessage('danger', '<i class="bi bi-exclamation-triangle-fill me-2"></i>Network error. Please try again.');
        if (progressContainer) progressContainer.classList.add('d-none');
      });

      xhr.addEventListener('abort', function () {
        showMessage('warning', 'Upload cancelled.');
        if (progressContainer) progressContainer.classList.add('d-none');
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<i class="bi bi-cloud-upload me-2"></i>Upload';
        }
      });

      xhr.open('POST', uploadForm.action || '/upload', true);
      xhr.setRequestHeader('Accept', 'application/json');
      xhr.send(formData);
    });
  }

  // ── Helpers ─────────────────────────────────────────

  function setProgress(pct) {
    if (!progressBar) return;
    progressBar.style.width = pct + '%';
    progressBar.setAttribute('aria-valuenow', pct);
    progressBar.textContent = pct + '%';
    if (pct >= 100) {
      progressBar.classList.remove('progress-bar-animated');
      progressBar.classList.add('bg-success');
    } else {
      progressBar.classList.add('progress-bar-animated');
      progressBar.classList.remove('bg-success');
    }
  }

  function showMessage(type, html) {
    if (!messageContainer) return;
    const id = 'msg-' + Date.now();
    const div = document.createElement('div');
    div.id = id;
    div.className = `alert alert-${type} mt-3`;
    div.setAttribute('role', 'alert');
    div.innerHTML = html;
    messageContainer.innerHTML = '';
    messageContainer.appendChild(div);
  }

  function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
});