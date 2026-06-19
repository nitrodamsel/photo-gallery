/**
 * main.js — Client-side bootstrapper for Photo Gallery
 *
 * Phase 1: Minimal setup. This file will grow in later phases
 * to handle file uploads, gallery interactions, tag filtering, etc.
 */

(function () {
  'use strict';

  /**
   * App namespace
   */
  const PhotoGallery = {
    version: '1.0.0',

    /**
     * Initialise all modules
     */
    init() {
      this.initTooltips();
      this.initNavHighlight();
      console.log(`📸 Photo Gallery v${this.version} initialised.`);
    },

    /**
     * Bootstrap 5 tooltip initialisation
     */
    initTooltips() {
      const tooltipEls = document.querySelectorAll('[data-bs-toggle="tooltip"]');
      tooltipEls.forEach(el => {
        // Bootstrap's Tooltip constructor is available globally via the CDN bundle
        if (typeof bootstrap !== 'undefined' && bootstrap.Tooltip) {
          new bootstrap.Tooltip(el);
        }
      });
    },

    /**
     * Highlight the active nav link based on current pathname
     */
    initNavHighlight() {
      const path = window.location.pathname;
      const navLinks = document.querySelectorAll('.navbar-nav .nav-link');

      navLinks.forEach(link => {
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
  };

  // Run after the DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => PhotoGallery.init());
  } else {
    PhotoGallery.init();
  }

  // Expose to window for debugging in development
  window.PhotoGallery = PhotoGallery;
})();