'use strict';

const { ThumbnailCache } = require('../models');
const fs = require('fs').promises;
const path = require('path');

/**
 * Cache service for managing thumbnail and response caches.
 */
class CacheService {
  constructor() {
    this.memoryCache = new Map();
  }

  /**
   * Get a value from the in-memory cache
   */
  get(key) {
    const entry = this.memoryCache.get(key);
    if (!entry) return null;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.memoryCache.delete(key);
      return null;
    }
    return entry.value;
  }

  /**
   * Set a value in the in-memory cache
   */
  set(key, value, ttlMs = 300000) {
    this.memoryCache.set(key, {
      value,
      expiresAt: ttlMs ? Date.now() + ttlMs : null,
    });
  }

  /**
   * Delete a value from the in-memory cache
   */
  delete(key) {
    this.memoryCache.delete(key);
  }

  /**
   * Flush all caches:
   * - In-memory cache
   * - Database thumbnail cache records
   * - Cached thumbnail files
   */
  async flush() {
    // Clear in-memory cache
    this.memoryCache.clear();

    // Clear database thumbnail cache
    try {
      await ThumbnailCache.destroy({ where: {} });
    } catch (err) {
      console.warn('Could not clear ThumbnailCache table:', err.message);
    }

    // Clear cached thumbnail files
    const cacheDir = path.join(__dirname, '../uploads/thumbnails');
    try {
      const files = await fs.readdir(cacheDir);
      await Promise.all(
        files.map((file) => fs.unlink(path.join(cacheDir, file)).catch(() => {}))
      );
      console.log(`Flushed ${files.length} cached thumbnail files`);
    } catch (err) {
      // Directory may not exist
      if (err.code !== 'ENOENT') {
        console.warn('Could not clear thumbnail directory:', err.message);
      }
    }

    return true;
  }

  /**
   * Get cache statistics
   */
  stats() {
    return {
      memoryEntries: this.memoryCache.size,
    };
  }
}

// Export singleton instance
module.exports = new CacheService();