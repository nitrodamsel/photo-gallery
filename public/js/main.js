/**
 * PhotoGallery — Client-Side Bootstrapper
 *
 * Phase 1: Minimal setup. This file will grow in later phases to handle
 * drag-and-drop uploads, gallery interactions, tag filtering, and more.
 */

(function () {
  'use strict';

  // ── DOM Ready ──────────────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function () {
    console.log('[PhotoGallery] Client JS initialized ✅');
    initNavHighlight();
    initTooltips();
  });

  /**
   * Highlights the active nav link based on the current URL path.
   */
  function initNavHighlight() {
    const path = window.location.pathname;
    const navLinks = document.querySelectorAll('.navbar-nav .nav-link');

    navLinks.forEach(function (link) {
      const href = link.getAttribute('href');
      if (href && href !== '/' && path.startsWith(href)) {
        link.classList.add('active');
        link.setAttribute('aria-current', 'page');
      } else if (href === '/' && path === '/') {
        link.classList.add('active');
        link.setAttribute('aria-current', 'page');
      }
    });
  }

  /**
   * Initialises Bootstrap tooltips on any element with [data-bs-toggle="tooltip"].
   */
  function initTooltips() {
    if (typeof bootstrap === 'undefined') return;
    const tooltipEls = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    tooltipEls.forEach(function (el) {
      new bootstrap.Tooltip(el);
    });
  }

  // Expose a small public API for future phases
  window.PhotoGallery = {
    version: '1.0.0',
  };
})();