/**
 * main.js — Client-side bootstrapper for PhotoGallery
 *
 * Phase 1: minimal setup.
 * Subsequent phases will add upload handling, gallery interactions,
 * tag filtering, and EXIF display logic here.
 */

(function () {
  'use strict';

  // ── DOM Ready ─────────────────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    console.info('[PhotoGallery] App initialised.');

    initNavActiveLinks();
  });

  // ── Utilities ──────────────────────────────────────────────────────────────────

  /**
   * Mark the current nav link as active based on the URL pathname.
   */
  function initNavActiveLinks() {
    const currentPath = window.location.pathname;

    document.querySelectorAll('.navbar-nav .nav-link').forEach((link) => {
      const href = link.getAttribute('href');
      if (href && href !== '/' && currentPath.startsWith(href)) {
        link.classList.add('active');
        link.setAttribute('aria-current', 'page');
      } else if (href === '/' && currentPath === '/') {
        link.classList.add('active');
        link.setAttribute('aria-current', 'page');
      }
    });
  }

  // ── Feature stubs (to be implemented in later phases) ─────────────────────────

  /**
   * Phase 2+: Gallery grid, lazy-loading, lightbox.
   */
  // function initGallery() { ... }

  /**
   * Phase 3+: Drag-and-drop upload with progress indicator.
   */
  // function initUploader() { ... }

  /**
   * Phase 4+: Tag filtering and search.
   */
  // function initTagFilter() { ... }

})();