/**
 * PhotoGallery — Client-side JavaScript Bootstrapper
 *
 * Phase 1: Minimal setup. This file will grow in later phases
 * to handle upload interactions, gallery filtering, tag management,
 * and EXIF metadata display.
 */

'use strict';

(function () {
  // ── DOM Ready ───────────────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function () {
    console.log('[PhotoGallery] Client JS loaded ✓');

    initNavbar();
    initTooltips();
    highlightActiveNavLink();
  });

  // ── Navbar Scroll Behaviour ─────────────────────────────────────────────────
  function initNavbar() {
    const navbar = document.querySelector('.app-navbar');
    if (!navbar) return;

    const handleScroll = () => {
      if (window.scrollY > 20) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // run once on load
  }

  // ── Bootstrap Tooltips ──────────────────────────────────────────────────────
  function initTooltips() {
    if (typeof bootstrap === 'undefined') return;

    const tooltipEls = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    tooltipEls.forEach(function (el) {
      new bootstrap.Tooltip(el);
    });
  }

  // ── Active Nav Link ─────────────────────────────────────────────────────────
  function highlightActiveNavLink() {
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.app-navbar .nav-link');

    navLinks.forEach(function (link) {
      const href = link.getAttribute('href');
      if (!href) return;

      const isActive =
        href === '/'
          ? currentPath === '/'
          : currentPath.startsWith(href);

      if (isActive) {
        link.classList.add('active');
        link.setAttribute('aria-current', 'page');
      }
    });
  }

  // ── Utility: Format File Size ───────────────────────────────────────────────
  /**
   * Converts a byte count to a human-readable string.
   * @param {number} bytes
   * @param {number} [decimals=1]
   * @returns {string}
   */
  function formatFileSize(bytes, decimals = 1) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
  }

  // ── Utility: Debounce ───────────────────────────────────────────────────────
  /**
   * Returns a debounced version of the given function.
   * @param {Function} fn
   * @param {number} delay
   * @returns {Function}
   */
  function debounce(fn, delay) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  // ── Expose public utilities for later phases ────────────────────────────────
  window.PhotoGallery = {
    formatFileSize,
    debounce,
  };
})();