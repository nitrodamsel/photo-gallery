/**
 * Drag-and-drop upload with XMLHttpRequest for progress tracking
 * Updates progress bar, shows thumbnail preview on completion,
 * appends success/error messages
 */

(function () {
  'use strict';

  function initUpload() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const uploadForm = document.getElementById('uploadForm');
    const progressContainer = document.getElementById('progressContainer');
    const progressBar = document.getElementById('uploadProgressBar');
    const progressText = document.getElementById('progressText');
    const previewContainer = document.getElementById('previewContainer');
    const uploadResults = document.getElementById('uploadResults');
    const selectFilesBtn = document.getElementById('selectFilesBtn');

    if (!dropZone || !fileInput) return;

    // ---- Open file picker on button click ----
    if (selectFilesBtn) {
      selectFilesBtn.addEventListener('click', function (e) {
        e.preventDefault();
        fileInput.click();
      });
    }

    // ---- Click on drop zone to open file picker ----
    dropZone.addEventListener('click', function (e) {
      if (e.target === dropZone || e.target.closest('#dropZoneContent')) {
        fileInput.click();
      }
    });

    // ---- Drag and Drop Events ----
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      dropZone.addEventListener(eventName, preventDefaults, false);
      document.body.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
      e.preventDefault();
      e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
      dropZone.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropZone.addEventListener(eventName, unhighlight, false);
    });

    function highlight() {
      dropZone.classList.add('drag-over');
    }

    function unhighlight() {
      dropZone.classList.remove('drag-over');
    }

    // ---- Handle dropped files ----
    dropZone.addEventListener('drop', function (e) {
      const dt = e.dataTransfer;
      const files = dt.files;
      handleFiles(files);
    });

    // ---- Handle file input change ----
    fileInput.addEventListener('change', function () {
      handleFiles(this.files);
    });

    // ---- Process files ----
    function handleFiles(files) {
      if (!files || files.length === 0) return;

      // Validate file types
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/tiff'];
      const validFiles = Array.from(files).filter(file => validTypes.includes(file.type));

      if (validFiles.length === 0) {
        appendResult('error', 'No valid image files selected. Please use JPEG, PNG, GIF, WebP, or TIFF.');
        return;
      }

      if (validFiles.length !== files.length) {
        appendResult('warning', `${files.length - validFiles.length} file(s) were skipped (unsupported format).`);
      }

      // Show preview for selected files
      if (previewContainer) {
        previewContainer.innerHTML = '';
        previewContainer.classList.remove('d-none');
      }

      validFiles.forEach(file => showPreview(file));

      // Upload files one by one (or could batch)
      uploadFiles(validFiles);
    }

    // ---- Show preview thumbnail before upload ----
    function showPreview(file) {
      if (!previewContainer) return;

      const reader = new FileReader();
      const previewWrapper = document.createElement('div');
      previewWrapper.className = 'preview-item position-relative me-2 mb-2 d-inline-block';
      previewWrapper.style.width = '100px';
      previewWrapper.style.height = '100px';

      const img = document.createElement('img');
      img.className = 'img-thumbnail w-100 h-100';
      img.style.objectFit = 'cover';
      img.dataset.filename = file.name;

      const overlay = document.createElement('div');
      overlay.className = 'preview-overlay position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center';
      overlay.innerHTML = '<div class="spinner-border spinner-border-sm text-light" role="status"></div>';
      overlay.style.background = 'rgba(0,0,0,0.4)';

      previewWrapper.appendChild(img);
      previewWrapper.appendChild(overlay);
      previewContainer.appendChild(previewWrapper);

      reader.onload = function (e) {
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);

      // Store overlay reference for later update
      previewWrapper.dataset.filename = file.name;
    }

    // ---- Update preview status ----
    function updatePreviewStatus(filename, success) {
      if (!previewContainer) return;
      const wrapper = previewContainer.querySelector(`[data-filename="${CSS.escape(filename)}"]`);
      if (!wrapper) return;
      const overlay = wrapper.querySelector('.preview-overlay');
      if (overlay) {
        overlay.innerHTML = success
          ? '<i class="bi bi-check-circle-fill text-success fs-4"></i>'
          : '<i class="bi bi-x-circle-fill text-danger fs-4"></i>';
        overlay.style.background = success ? 'rgba(0,128,0,0.3)' : 'rgba(255,0,0,0.3)';
      }
    }

    // ---- Upload files sequentially ----
    async function uploadFiles(files) {
      if (progressContainer) progressContainer.classList.remove('d-none');
      if (uploadResults) uploadResults.innerHTML = '';

      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (progressText) {
          progressText.textContent = `Uploading ${i + 1} of ${files.length}: ${file.name}`;
        }

        try {
          await uploadSingleFile(file, i, files.length);
          successCount++;
          updatePreviewStatus(file.name, true);
          appendResult('success', `✓ "${file.name}" uploaded successfully`);
        } catch (err) {
          errorCount++;
          updatePreviewStatus(file.name, false);
          appendResult('error', `✗ "${file.name}": ${err.message || 'Upload failed'}`);
        }
      }

      // Final progress
      setProgress(100);
      if (progressText) {
        progressText.textContent = `Done! ${successCount} uploaded${errorCount > 0 ? `, ${errorCount} failed` : ''}.`;
      }

      // Reset form after delay
      setTimeout(() => {
        if (fileInput) fileInput.value = '';
        if (progressContainer) progressContainer.classList.add('d-none');
        setProgress(0);
      }, 3000);

      // If all successful, offer to go to gallery
      if (successCount > 0 && errorCount === 0) {
        appendResult('info', `<a href="/gallery" class="alert-link">View uploaded images in the gallery →</a>`);
      }
    }

    // ---- Upload a single file via XHR ----
    function uploadSingleFile(file, index, total) {
      return new Promise((resolve, reject) => {
        const formData = new FormData();

        // Get form fields if form exists
        if (uploadForm) {
          const titleInput = uploadForm.querySelector('[name="title"]');
          const descInput = uploadForm.querySelector('[name="description"]');
          const tagsInput = uploadForm.querySelector('[name="tags"]');
          const isPublicInput = uploadForm.querySelector('[name="isPublic"]');

          if (titleInput && titleInput.value) formData.append('title', titleInput.value);
          if (descInput && descInput.value) formData.append('description', descInput.value);
          if (tagsInput && tagsInput.value) formData.append('tags', tagsInput.value);
          if (isPublicInput) formData.append('isPublic', isPublicInput.checked ? 'true' : 'false');
        }

        formData.append('image', file);

        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener('progress', function (e) {
          if (e.lengthComputable) {
            // Progress per file, scaled across all files
            const fileProgress = (e.loaded / e.total) * 100;
            const overallProgress = ((index / total) * 100) + (fileProgress / total);
            setProgress(Math.round(overallProgress));
          }
        });

        xhr.addEventListener('load', function () {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              resolve(response);
            } catch (e) {
              resolve({ success: true });
            }
          } else {
            let errorMsg = 'Upload failed';
            try {
              const response = JSON.parse(xhr.responseText);
              errorMsg = response.error || response.message || errorMsg;
            } catch (e) {
              // ignore parse error
            }
            reject(new Error(errorMsg));
          }
        });

        xhr.addEventListener('error', function () {
          reject(new Error('Network error during upload'));
        });

        xhr.addEventListener('abort', function () {
          reject(new Error('Upload was aborted'));
        });

        xhr.open('POST', '/upload');
        xhr.send(formData);
      });
    }

    // ---- Set progress bar ----
    function setProgress(percent) {
      if (!progressBar) return;
      progressBar.style.width = `${percent}%`;
      progressBar.setAttribute('aria-valuenow', percent);
      progressBar.textContent = `${percent}%`;
    }

    // ---- Append result message ----
    function appendResult(type, message) {
      if (!uploadResults) return;
      const typeMap = {
        'success': 'success',
        'error': 'danger',
        'warning': 'warning',
        'info': 'info'
      };
      const alertType = typeMap[type] || 'info';
      const div = document.createElement('div');
      div.className = `alert alert-${alertType} py-1 px-2 mb-1 small`;
      div.innerHTML = message;
      uploadResults.appendChild(div);
    }
  }

  document.addEventListener('DOMContentLoaded', initUpload);
})();