/**
 * Lazy loading implementation using IntersectionObserver.
 * Watches all img[data-src] elements and swaps data-src → src
 * when the element enters the viewport.
 *
 * Usage: Add data-src="/path/to/image.jpg" to img elements
 * instead of src. Optionally add class="lazy" for fade-in animation.
 */
(function () {
  'use strict';

  /**
   * Load an image by swapping data-src to src.
   * @param {HTMLImageElement} img
   */
  function loadImage(img) {
    const src = img.dataset.src;
    if (!src) return;

    // Optionally set srcset if data-srcset is present
    if (img.dataset.srcset) {
      img.srcset = img.dataset.srcset;
      delete img.dataset.srcset;
    }

    img.src = src;
    delete img.dataset.src;

    img.onload = function () {
      img.classList.add('loaded');
      img.classList.remove('lazy-pending');
    };

    img.onerror = function () {
      img.classList.add('lazy-error');
      img.classList.remove('lazy-pending');
      console.warn('[LazyLoad] Failed to load image:', src);
    };
  }

  /**
   * Initialize the IntersectionObserver for lazy loading.
   */
  function initLazyLoad() {
    const lazyImages = Array.from(document.querySelectorAll('img[data-src]'));

    if (lazyImages.length === 0) return;

    // Mark all lazy images with a pending class
    lazyImages.forEach((img) => img.classList.add('lazy-pending'));

    if (!('IntersectionObserver' in window)) {
      // Fallback for browsers without IntersectionObserver support
      console.info('[LazyLoad] IntersectionObserver not supported, loading all images immediately.');
      lazyImages.forEach(loadImage);
      return;
    }

    const observer = new IntersectionObserver(
      function (entries, obs) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            const img = entry.target;
            loadImage(img);
            obs.unobserve(img);
          }
        });
      },
      {
        root: null, // viewport
        rootMargin: '200px 0px', // Start loading 200px before entering viewport
        threshold: 0.01, // Trigger when even 1% of image is visible
      }
    );

    lazyImages.forEach((img) => observer.observe(img));
  }

  /**
   * Re-observe any new lazy images added to the DOM after initial load.
   * Useful for dynamically added content (infinite scroll, etc.)
   */
  function observeNewImages() {
    if (!('MutationObserver' in window)) return;

    const mutationObserver = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        mutation.addedNodes.forEach(function (node) {
          if (node.nodeType !== Node.ELEMENT_NODE) return;

          // Check if the node itself is a lazy image
          if (node.matches && node.matches('img[data-src]')) {
            node.classList.add('lazy-pending');
            initObserverForElement(node);
          }

          // Check descendant images
          const imgs = node.querySelectorAll ? node.querySelectorAll('img[data-src]') : [];
          imgs.forEach(function (img) {
            img.classList.add('lazy-pending');
            initObserverForElement(img);
          });
        });
      });
    });

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  // Separate observer for dynamically added elements
  let dynamicObserver = null;

  function initObserverForElement(img) {
    if (!('IntersectionObserver' in window)) {
      loadImage(img);
      return;
    }

    if (!dynamicObserver) {
      dynamicObserver = new IntersectionObserver(
        function (entries, obs) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              loadImage(entry.target);
              obs.unobserve(entry.target);
            }
          });
        },
        {
          root: null,
          rootMargin: '200px 0px',
          threshold: 0.01,
        }
      );
    }

    dynamicObserver.observe(img);
  }

  // Initialize on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      initLazyLoad();
      observeNewImages();
    });
  } else {
    // DOM already loaded
    initLazyLoad();
    observeNewImages();
  }

  // Expose API for manual triggering
  window.LazyLoad = {
    init: initLazyLoad,
    loadImage: loadImage,
  };
})();