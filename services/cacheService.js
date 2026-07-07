'use strict';

const { ThumbnailCache, sequelize } = require('../models');

/**
 * Simple cache service for managing thumbnail and other caches.
 */
const cacheService = {
  /**
   * Flush all cached thumbnail records from the database.
   * Physical files are not deleted — they will be regenerated on demand.
   */
  async flush() {
    await ThumbnailCache.destroy({ where: {}, truncate: true });
    console.log('[CacheService] Thumbnail cache flushed');
    return true;
  },

  /**
   * Get cache statistics
   */
  async stats() {
    const count = await ThumbnailCache.count();
    const sizeResult = await ThumbnailCache.findOne({
      attributes: [[sequelize.fn('SUM', sequelize.col('fileSize')), 'totalBytes']],
      raw: true,
    });
    return {
      count,
      totalBytes: parseInt(sizeResult?.totalBytes || 0),
    };
  },
};

module.exports = cacheService;