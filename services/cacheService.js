const { LRUCache } = require('lru-cache');

/**
 * djb2 hash function for compact cache keys.
 * @param {string} str
 * @returns {string} hex hash string
 */
function djb2Hash(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    // hash * 33 ^ char
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
    hash = hash >>> 0; // Convert to unsigned 32-bit integer
  }
  return hash.toString(16);
}

/**
 * Generates a compact cache key from a query object.
 * @param {object|string} obj
 * @returns {string}
 */
function hashQuery(obj) {
  const str = typeof obj === 'string' ? obj : JSON.stringify(obj);
  return djb2Hash(str);
}

// Create LRU cache instance
// max: 200 entries
// ttl: 5 minutes (300,000 ms)
const cache = new LRUCache({
  max: 200,
  ttl: 1000 * 60 * 5, // 5 minutes
  ttlAutopurge: false, // Purge on access only to avoid overhead
  allowStale: false,
  updateAgeOnGet: false,
  updateAgeOnHas: false,
});

/**
 * Get a value from the cache.
 * @param {string} key
 * @returns {*} cached value or undefined
 */
function get(key) {
  return cache.get(key);
}

/**
 * Set a value in the cache.
 * @param {string} key
 * @param {*} value
 * @param {object} [options] - optional lru-cache options (e.g., { ttl: ms })
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
 * Flush (clear) all entries from the cache.
 */
function flush() {
  cache.clear();
}

/**
 * Get cache statistics.
 * @returns {object}
 */
function stats() {
  return {
    size: cache.size,
    max: 200,
    calculatedSize: cache.calculatedSize,
  };
}

module.exports = { get, set, del, flush, hashQuery, stats };