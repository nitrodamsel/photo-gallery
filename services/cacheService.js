'use strict';

const NodeCache = require('node-cache');

// Default TTL: 5 minutes
const cache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

const cacheService = {
  /**
   * Get a value from cache.
   * @param {string} key
   * @returns {any|undefined}
   */
  get(key) {
    return cache.get(key);
  },

  /**
   * Set a value in cache.
   * @param {string} key
   * @param {any} value
   * @param {number} [ttl] - TTL in seconds (optional, uses default if not specified)
   */
  set(key, value, ttl) {
    if (ttl !== undefined) {
      cache.set(key, value, ttl);
    } else {
      cache.set(key, value);
    }
  },

  /**
   * Delete a value from cache.
   * @param {string} key
   */
  del(key) {
    cache.del(key);
  },

  /**
   * Flush all cache entries.
   */
  flush() {
    cache.flushAll();
    return Promise.resolve();
  },

  /**
   * Get cache statistics.
   */
  stats() {
    return cache.getStats();
  },

  /**
   * Get all cache keys.
   */
  keys() {
    return cache.keys();
  },

  /**
   * Check if a key exists.
   * @param {string} key
   */
  has(key) {
    return cache.has(key);
  },
};

module.exports = cacheService;