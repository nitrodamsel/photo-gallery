/**
 * Lazy Loading with IntersectionObserver
 * Watches all img[data-src] elements and swaps data-src → src
 * when the element enters the viewport (with 200px root margin).
 * Adds 'loaded' class for CSS fade-in transition.
 */
(function () {
  'use strict';

  /**
   * Load a lazy image by swapping data-src to src.
   * Also handles data-srcset for responsive images.
   * @param {HTMLImageElement} img
   */
  function loadImage(img) {
    const src = img.dataset.src;
    const srcset = img.dataset.srcset;

    if (!src && !srcset) return;

    // Create a new Image to preload before displaying
    const tempImg = new window.Image();

    tempImg.onload = function () {
      if (src) img.src = src;
      if (srcset) img.srcset = srcset;
      img.classList.add('loaded');
      img.removeAttribute('data-src');
      img.removeAttribute('data-srcset');
    };

    tempImg.onerror = function () {
      // Still try to show even on error, mark as loaded to prevent retries
      if (src) img.src = src;
      img.classList.add('loaded');
      img.classList.add('error');
      img.removeAttribute('data-src');
    };

    // Start loading
    tempImg.src = src || srcset;
  }

  /**
   * Fallback for browsers without IntersectionObserver support.
   * Loads all lazy images immediately.
   */
  function loadAllImages() {
    const lazyImages = document.querySelectorAll('img[data-src]');
    lazyImages.forEach(loadImage);
  }

  /**
   * Initialize IntersectionObserver-based lazy loading.
   */
  function initLazyLoad() {
    if (!('IntersectionObserver' in window)) {
      // Fallback: load all images immediately
      loadAllImages();
      return;
    }

    const observerOptions = {
      root: null, // Use viewport as root
      rootMargin: '200px 0px', // Load images 200px before they enter viewport
      threshold: 0.01, // Trigger when 1% of element is visible
    };

    const observer = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          const img = entry.target;
          loadImage(img);
          obs.unobserve(img); // Stop observing once loaded
        }
      });
    }, observerOptions);

    // Observe all current lazy images
    const lazyImages = document.querySelectorAll('img[data-src]');
    lazyImages.forEach(function (img) {
      observer.observe(img);
    });

    // Also observe dynamically added images using a MutationObserver
    if ('MutationObserver' in window) {
      const mutationObserver = new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
          mutation.addedNodes.forEach(function (node) {
            if (node.nodeType !== Node.ELEMENT_NODE) return;

            // Check if the node itself is a lazy image
            if (node.tagName === 'IMG' && node.dataset.src) {
              observer.observe(node);
            }

            // Check for lazy images within the added node
            const imgs = node.querySelectorAll && node.querySelectorAll('img[data-src]');
            if (imgs) {
              imgs.forEach(function (img) {
                observer.observe(img);
              });
            }
          });
        });
      });

      mutationObserver.observe(document.body, {
        childList: true,
        subtree: true,
      });
    }

    return observer;
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLazyLoad);
  } else {
    initLazyLoad();
  }

  // Expose for manual triggering if needed
  window.LazyLoad = {
    init: initLazyLoad,
    loadAll: loadAllImages,
    loadImage: loadImage,
  };
})();