/**
 * main.js — Client-side bootstrapper for PhotoGallery
 *
 * This file will grow in later phases as features are added.
 * Currently it sets up global utilities and initialises
 * Bootstrap tooltips / popovers if present.
 */

(function () {
  'use strict';

  /* ------------------------------------------------------------------
   * Bootstrap component initialisation
   * ------------------------------------------------------------------ */
  function initBootstrapComponents() {
    // Tooltips
    const tooltipEls = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    if (tooltipEls.length && window.bootstrap?.Tooltip) {
      tooltipEls.forEach((el) => new bootstrap.Tooltip(el));
    }

    // Popovers
    const popoverEls = document.querySelectorAll('[data-bs-toggle="popover"]');
    if (popoverEls.length && window.bootstrap?.Popover) {
      popoverEls.forEach((el) => new bootstrap.Popover(el));
    }
  }

  /* ------------------------------------------------------------------
   * Navbar: highlight active link based on current path
   * ------------------------------------------------------------------ */
  function highlightActiveNavLink() {
    const links = document.querySelectorAll('.navbar-nav .nav-link');
    const currentPath = window.location.pathname;

    links.forEach((link) => {
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

  /* ------------------------------------------------------------------
   * Flash message auto-dismiss
   * ------------------------------------------------------------------ */
  function initFlashMessages() {
    const alerts = document.querySelectorAll('.alert-dismissible.auto-dismiss');
    alerts.forEach((alert) => {
      const delay = parseInt(alert.dataset.delay, 10) || 4000;
      setTimeout(() => {
        const bsAlert = window.bootstrap?.Alert?.getOrCreateInstance(alert);
        if (bsAlert) bsAlert.close();
        else alert.remove();
      }, delay);
    });
  }

  /* ------------------------------------------------------------------
   * DOMContentLoaded entry point
   * ------------------------------------------------------------------ */
  document.addEventListener('DOMContentLoaded', () => {
    initBootstrapComponents();
    highlightActiveNavLink();
    initFlashMessages();

    console.log('[PhotoGallery] Client bootstrapper loaded ✓');
  });
})();