/**
 * Lazy Loading via IntersectionObserver
 * Watches all img[data-src] elements and swaps data-src → src
 * when the element enters the viewport (with 200px rootMargin).
 * Adds 'loaded' class for CSS fade-in transition.
 */
(function () {
  'use strict';

  /**
   * Load a single image element by swapping data-src to src.
   * @param {HTMLImageElement} img
   */
  function loadImage(img) {
    const src = img.dataset.src;
    const srcset = img.dataset.srcset;

    if (!src) return;

    // Create a new image to preload
    const tempImg = new Image();

    tempImg.onload = function () {
      img.src = src;
      if (srcset) {
        img.srcset = srcset;
      }
      img.removeAttribute('data-src');
      img.removeAttribute('data-srcset');
      // Small timeout to allow repaint before adding class
      requestAnimationFrame(function () {
        img.classList.add('loaded');
      });
    };

    tempImg.onerror = function () {
      // Still mark as attempted to avoid re-trying
      img.classList.add('error');
      img.removeAttribute('data-src');
    };

    tempImg.src = src;
    if (srcset) {
      tempImg.srcset = srcset;
    }
  }

  /**
   * Initialize lazy loading with IntersectionObserver.
   */
  function initLazyLoad() {
    const lazyImages = Array.from(document.querySelectorAll('img[data-src]'));

    if (lazyImages.length === 0) return;

    // Check for IntersectionObserver support
    if (!('IntersectionObserver' in window)) {
      // Fallback: load all images immediately
      lazyImages.forEach(loadImage);
      return;
    }

    const observerOptions = {
      root: null, // Use viewport as root
      rootMargin: '200px 0px', // Load images 200px before they enter viewport
      threshold: 0,
    };

    const observer = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          const img = entry.target;
          loadImage(img);
          obs.unobserve(img); // Stop watching once loaded
        }
      });
    }, observerOptions);

    lazyImages.forEach(function (img) {
      // Add skeleton/placeholder class
      if (!img.classList.contains('lazy')) {
        img.classList.add('lazy');
      }
      observer.observe(img);
    });
  }

  /**
   * Re-initialize lazy loading (e.g., after dynamic content is added).
   */
  function refreshLazyLoad() {
    const unloadedImages = document.querySelectorAll('img[data-src]');
    if (unloadedImages.length === 0) return;

    if (!('IntersectionObserver' in window)) {
      unloadedImages.forEach(loadImage);
      return;
    }

    const observerOptions = {
      root: null,
      rootMargin: '200px 0px',
      threshold: 0,
    };

    const observer = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          const img = entry.target;
          loadImage(img);
          obs.unobserve(img);
        }
      });
    }, observerOptions);

    unloadedImages.forEach(function (img) {
      if (!img.classList.contains('lazy')) {
        img.classList.add('lazy');
      }
      observer.observe(img);
    });
  }

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLazyLoad);
  } else {
    initLazyLoad();
  }

  // Expose API for dynamic content scenarios
  window.LazyLoad = {
    init: initLazyLoad,
    refresh: refreshLazyLoad,
    loadImage: loadImage,
  };
})();