/**
 * main.js — Client-side bootstrapper for Photo Gallery App
 *
 * Phase 1: Minimal setup. Functionality will grow in later phases.
 */

(function () {
  'use strict';

  // ── Utility: Log helper ──────────────────────────────────────────────────
  const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  function log(...args) {
    if (isDev) {
      console.log('[PhotoGallery]', ...args);
    }
  }

  // ── Active nav link highlighting ─────────────────────────────────────────
  function highlightActiveNavLink() {
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.navbar .nav-link');

    navLinks.forEach(function (link) {
      const linkPath = new URL(link.href, window.location.origin).pathname;

      if (linkPath === '/' && currentPath === '/') {
        link.classList.add('active');
        link.setAttribute('aria-current', 'page');
      } else if (linkPath !== '/' && currentPath.startsWith(linkPath)) {
        link.classList.add('active');
        link.setAttribute('aria-current', 'page');
      }
    });
  }

  // ── Flash messages auto-dismiss ──────────────────────────────────────────
  function initFlashMessages() {
    const alerts = document.querySelectorAll('.alert-dismissible[data-auto-dismiss]');

    alerts.forEach(function (alert) {
      const delay = parseInt(alert.dataset.autoDismiss, 10) || 5000;

      setTimeout(function () {
        const bsAlert = window.bootstrap && window.bootstrap.Alert.getOrCreateInstance(alert);
        if (bsAlert) {
          bsAlert.close();
        }
      }, delay);
    });
  }

  // ── Lazy loading images ──────────────────────────────────────────────────
  function initLazyImages() {
    if ('loading' in HTMLImageElement.prototype) {
      // Native lazy loading supported
      const lazyImages = document.querySelectorAll('img[data-src]');
      lazyImages.forEach(function (img) {
        img.src = img.dataset.src;
        img.removeAttribute('data-src');
      });
    } else if ('IntersectionObserver' in window) {
      // Fallback: Intersection Observer
      const observer = new IntersectionObserver(function (entries, obs) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            const img = entry.target;
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
            obs.unobserve(img);
          }
        });
      }, { rootMargin: '200px' });

      document.querySelectorAll('img[data-src]').forEach(function (img) {
        observer.observe(img);
      });
    }
  }

  // ── Smooth scroll for anchor links ──────────────────────────────────────
  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
      anchor.addEventListener('click', function (e) {
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  }

  // ── DOM Ready ────────────────────────────────────────────────────────────
  function init() {
    log('Initialising…');

    highlightActiveNavLink();
    initFlashMessages();
    initLazyImages();
    initSmoothScroll();

    log('Ready ✓');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();