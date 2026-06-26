'use strict';

// =====================================================
// Utility: format file size
// =====================================================
function formatFileSize(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

// =====================================================
// Mark active nav links
// =====================================================
(function markActiveNav() {
  const path = window.location.pathname;
  document.querySelectorAll('.nav-link').forEach(function(link) {
    const href = link.getAttribute('href');
    if (href && href !== '/' && path.startsWith(href)) {
      link.classList.add('active');
      link.setAttribute('aria-current', 'page');
    } else if (href === '/' && path === '/') {
      link.classList.add('active');
      link.setAttribute('aria-current', 'page');
    }
  });
})();

// =====================================================
// Lazy load images with IntersectionObserver fallback
// =====================================================
(function setupLazyImages() {
  if (!('IntersectionObserver' in window)) return;
  const images = document.querySelectorAll('img[loading="lazy"]');
  images.forEach(function(img) {
    if (img.complete) return;
    img.addEventListener('error', function() {
      img.closest('.image-card-thumb') && (img.closest('.image-card-thumb').style.background = '#1a1a22');
    });
  });
})();

// =====================================================
// Tag filter keyboard accessibility
// =====================================================
(function setupTagLinks() {
  document.querySelectorAll('.tag-badge[href]').forEach(function(badge) {
    badge.setAttribute('role', 'link');
  });
})();