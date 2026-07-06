const { LRUCache } = require('lru-cache');

/**
 * Simple djb2 hash for compact cache keys.
 * @param {string} str
 * @returns {string}
 */
function djb2Hash(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    // hash * 33 + charCode
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit integer
  }
  return (hash >>> 0).toString(36); // Unsigned, base36 for compact representation
}

/**
 * Creates a stable cache key from a query object.
 * @param {object} obj
 * @returns {string}
 */
function hashQuery(obj) {
  try {
    // Sort keys for stable serialization regardless of property insertion order
    const sorted = JSON.stringify(obj, Object.keys(obj || {}).sort());
    return djb2Hash(sorted);
  } catch (err) {
    // Fallback to timestamp-based key (no caching benefit, but won't break)
    return `fallback_${Date.now()}`;
  }
}

const cache = new LRUCache({
  max: 200,
  ttl: 5 * 60 * 1000, // 5 minutes in milliseconds
  allowStale: false,
  updateAgeOnGet: false,
  updateAgeOnHas: false,
});

/**
 * Get a value from the cache.
 * @param {string} key
 * @returns {*} The cached value, or undefined if not found/expired
 */
function get(key) {
  return cache.get(key);
}

/**
 * Set a value in the cache.
 * @param {string} key
 * @param {*} value
 * @param {object} [options] - Optional lru-cache set options (e.g., { ttl })
 */
function set(key, value, options = {}) {
  cache.set(key, value, options);
}

/**
 * Delete a specific key from the cache.
 * @param {string} key
 */
function del(key) {
  cache.delete(key);
}

/**
 * Flush (clear) the entire cache.
 */
function flush() {
  cache.clear();
}

/**
 * Get cache stats (for admin/debugging).
 * @returns {object}
 */
function stats() {
  return {
    size: cache.size,
    max: cache.max,
    calculatedSize: cache.calculatedSize,
  };
}

module.exports = {
  get,
  set,
  del,
  flush,
  hashQuery,
  stats,
};