'use strict';

// ============================================================
// Accordion panels
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('.accordion-toggle').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var expanded = this.getAttribute('aria-expanded') === 'true';
      this.setAttribute('aria-expanded', String(!expanded));
      var panelId = this.getAttribute('aria-controls');
      var panel = panelId ? document.getElementById(panelId) : null;
      if (panel) {
        panel.style.display = expanded ? 'none' : '';
      }
    });
  });
});

// ============================================================
// Simple lightbox (modal for full-size image)
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
  var triggers = document.querySelectorAll('.lightbox-trigger');
  if (!triggers.length) return;

  // Create modal element
  var modal = document.createElement('div');
  modal.id = 'lightbox-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-label', 'Image lightbox');
  modal.style.cssText = [
    'display:none',
    'position:fixed',
    'inset:0',
    'background:rgba(0,0,0,0.92)',
    'z-index:9999',
    'align-items:center',
    'justify-content:center',
    'cursor:zoom-out',
    'padding:1rem',
  ].join(';');

  var modalImg = document.createElement('img');
  modalImg.style.cssText = 'max-width:100%;max-height:90vh;border-radius:8px;box-shadow:0 8px 40px rgba(0,0,0,0.8);';
  modalImg.alt = '';

  var closeBtn = document.createElement('button');
  closeBtn.innerHTML = '&times;';
  closeBtn.setAttribute('aria-label', 'Close lightbox');
  closeBtn.style.cssText = [
    'position:absolute',
    'top:1rem',
    'right:1.5rem',
    'background:none',
    'border:none',
    'color:#fff',
    'font-size:2rem',
    'cursor:pointer',
    'line-height:1',
  ].join(';');

  modal.appendChild(modalImg);
  modal.appendChild(closeBtn);
  document.body.appendChild(modal);

  function openLightbox(href, alt) {
    modalImg.src = href;
    modalImg.alt = alt || '';
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    closeBtn.focus();
  }

  function closeLightbox() {
    modal.style.display = 'none';
    modalImg.src = '';
    document.body.style.overflow = '';
  }

  triggers.forEach(function(trigger) {
    trigger.addEventListener('click', function(e) {
      e.preventDefault();
      var img = this.querySelector('img');
      openLightbox(this.href, img ? img.alt : '');
    });
  });

  modal.addEventListener('click', function(e) {
    if (e.target === modal || e.target === closeBtn) closeLightbox();
  });

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && modal.style.display !== 'none') closeLightbox();
  });
});