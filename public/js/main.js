/**
 * main.js — Client-side bootstrapper for PhotoGallery
 *
 * Phase 1: minimal scaffolding.
 * Future phases will add upload handling, gallery filtering, lightbox, etc.
 */

(function () {
  'use strict';

  // ── DOM Ready ──────────────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function () {
    console.log('[PhotoGallery] Client JS initialised.');

    initNavActiveLinks();
  });

  /**
   * Highlight the current page's nav link based on pathname.
   */
  function initNavActiveLinks() {
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.navbar-nav .nav-link');

    navLinks.forEach(function (link) {
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

})();