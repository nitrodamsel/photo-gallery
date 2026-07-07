'use strict';

const { ThumbnailCache } = require('../models');

/**
 * Cache service for managing thumbnail and other caches.
 */
const cacheService = {
  /**
   * Flush all thumbnail cache records from the database.
   * Note: Does not delete actual thumbnail files from disk.
   */
  async flush() {
    try {
      const count = await ThumbnailCache.destroy({ where: {}, truncate: true });
      console.log(`[CacheService] Flushed all thumbnail cache records`);
      return { flushed: true };
    } catch (err) {
      console.error('[CacheService] Error flushing cache:', err);
      throw err;
    }
  },

  /**
   * Get cache stats
   */
  async getStats() {
    const count = await ThumbnailCache.count();
    return { thumbnailCacheCount: count };
  },

  /**
   * Invalidate cache for a specific image
   */
  async invalidateImage(imageId) {
    await ThumbnailCache.destroy({ where: { imageId } });
    console.log(`[CacheService] Invalidated cache for image ${imageId}`);
  },
};

module.exports = cacheService;