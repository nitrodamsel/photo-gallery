/**
 * PhotoGallery - Main JS
 */

(function() {
  'use strict';

  // ── Active nav link highlighting ──────────────────────────────────────────
  var currentPath = window.location.pathname;
  document.querySelectorAll('.nav-link').forEach(function(link) {
    if (link.getAttribute('href') && currentPath.startsWith(link.getAttribute('href')) && link.getAttribute('href') !== '/') {
      link.classList.add('active');
    }
  });

  // ── Simple lightbox ───────────────────────────────────────────────────────
  var lightboxTriggers = document.querySelectorAll('.lightbox-trigger');
  if (lightboxTriggers.length > 0) {
    // Create overlay
    var overlay = document.createElement('div');
    overlay.id = 'lightbox-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Image lightbox');
    overlay.style.cssText = [
      'display:none',
      'position:fixed',
      'inset:0',
      'background:rgba(0,0,0,0.92)',
      'z-index:9999',
      'align-items:center',
      'justify-content:center',
      'cursor:zoom-out',
    ].join(';');

    var lbImg = document.createElement('img');
    lbImg.alt = '';
    lbImg.style.cssText = 'max-width:95vw;max-height:95vh;object-fit:contain;border-radius:4px;';

    var lbClose = document.createElement('button');
    lbClose.innerHTML = '&#10005;';
    lbClose.setAttribute('aria-label', 'Close lightbox');
    lbClose.style.cssText = [
      'position:absolute',
      'top:1rem',
      'right:1rem',
      'background:rgba(255,255,255,0.15)',
      'border:none',
      'color:#fff',
      'font-size:1.5rem',
      'width:2.5rem',
      'height:2.5rem',
      'border-radius:50%',
      'cursor:pointer',
      'display:flex',
      'align-items:center',
      'justify-content:center',
    ].join(';');

    overlay.appendChild(lbImg);
    overlay.appendChild(lbClose);
    document.body.appendChild(overlay);

    function openLightbox(src, alt) {
      lbImg.src = src;
      lbImg.alt = alt || '';
      overlay.style.display = 'flex';
      document.body.style.overflow = 'hidden';
      lbClose.focus();
    }

    function closeLightbox() {
      overlay.style.display = 'none';
      document.body.style.overflow = '';
    }

    lightboxTriggers.forEach(function(trigger) {
      trigger.addEventListener('click', function(e) {
        e.preventDefault();
        openLightbox(this.href, this.dataset.title || '');
      });
    });

    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) closeLightbox();
    });

    lbClose.addEventListener('click', closeLightbox);

    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && overlay.style.display === 'flex') closeLightbox();
    });
  }

})();