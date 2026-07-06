const { LRUCache } = require('lru-cache');

/**
 * Simple djb2 hash for compact cache keys.
 * @param {string} str - Input string
 * @returns {string} Hex hash string
 */
function djb2Hash(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    // hash * 33 + char code
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit integer
  }
  // Convert to unsigned 32-bit and then to hex
  return (hash >>> 0).toString(16);
}

/**
 * Generate a compact cache key from a query object.
 * Uses JSON.stringify for deterministic serialization + djb2 hash.
 * @param {Object|string} obj - Query parameters or string key
 * @returns {string} Compact cache key
 */
function hashQuery(obj) {
  if (typeof obj === 'string') {
    return djb2Hash(obj);
  }
  // Sort keys for deterministic output
  const sorted = JSON.stringify(obj, Object.keys(obj).sort());
  return djb2Hash(sorted);
}

/**
 * LRU Cache instance.
 * - max: 200 entries
 * - ttl: 5 minutes (300,000 ms)
 * - allowStale: false (expired entries not returned)
 */
const cache = new LRUCache({
  max: 200,
  ttl: 5 * 60 * 1000, // 5 minutes in milliseconds
  allowStale: false,
  updateAgeOnGet: false,
  updateAgeOnHas: false,
});

/**
 * Get a value from cache.
 * @param {string} key - Cache key
 * @returns {*} Cached value or undefined
 */
function get(key) {
  return cache.get(key);
}

/**
 * Set a value in cache.
 * @param {string} key - Cache key
 * @param {*} value - Value to cache
 * @param {Object} [options] - Optional LRU cache options (e.g., { ttl })
 */
function set(key, value, options = {}) {
  cache.set(key, value, options);
}

/**
 * Delete a specific key from cache.
 * @param {string} key - Cache key
 */
function del(key) {
  cache.delete(key);
}

/**
 * Flush / clear all cache entries.
 */
function flush() {
  cache.clear();
}

/**
 * Get cache statistics.
 * @returns {Object} Stats object with size and itemCount
 */
function stats() {
  return {
    size: cache.size,
    maxSize: cache.max,
    calculatedSize: cache.calculatedSize,
  };
}

module.exports = {
  get,
  set,
  del,
  flush,
  hashQuery,
  cache, // Expose underlying cache for advanced use
  stats,
};