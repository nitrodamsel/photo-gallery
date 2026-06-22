/**
 * main.js — Client-side bootstrapper for PhotoGallery
 *
 * Phase 1: Minimal setup with utility helpers.
 * This file will grow as features are added in later phases.
 */

(function () {
  'use strict';

  // ============================================================
  // App Namespace
  // ============================================================
  const App = {
    version: '1.0.0',
    debug: document.documentElement.dataset.env !== 'production',

    /**
     * Initialize the application
     */
    init() {
      this.log('PhotoGallery initialized');
      this.highlightActiveNavLink();
      this.setupTooltips();
    },

    /**
     * Log messages in non-production environments
     */
    log(...args) {
      if (this.debug) {
        console.log('[PhotoGallery]', ...args);
      }
    },

    /**
     * Highlight the active nav link based on current path
     */
    highlightActiveNavLink() {
      const currentPath = window.location.pathname;
      const navLinks = document.querySelectorAll('.app-navbar .nav-link');

      navLinks.forEach((link) => {
        const href = link.getAttribute('href');
        if (href && href !== '/' && currentPath.startsWith(href)) {
          link.classList.add('active');
        } else if (href === '/' && currentPath === '/') {
          link.classList.add('active');
        }
      });
    },

    /**
     * Initialize Bootstrap tooltips if available
     */
    setupTooltips() {
      if (typeof bootstrap !== 'undefined' && bootstrap.Tooltip) {
        const tooltipEls = document.querySelectorAll('[data-bs-toggle="tooltip"]');
        tooltipEls.forEach((el) => {
          new bootstrap.Tooltip(el, { trigger: 'hover' });
        });
        this.log(`Initialized ${tooltipEls.length} tooltip(s)`);
      }
    },
  };

  // ============================================================
  // DOM Ready
  // ============================================================
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => App.init());
  } else {
    App.init();
  }

  // Expose to global scope for debugging
  window.PhotoGalleryApp = App;
})();