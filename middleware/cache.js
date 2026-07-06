const fs = require('fs');
const path = require('path');

/**
 * Express middleware factory for HTTP caching with ETag support.
 * Checks If-None-Match header against file mtime-based ETag.
 * @param {number} ttlSeconds - Cache-Control max-age value
 */
function cacheMiddleware(ttlSeconds = 31536000) {
  return (req, res, next) => {
    // Store original send to intercept
    const originalSend = res.send.bind(res);
    const originalJson = res.json.bind(res);

    // Set cache control headers
    res.setHeader('Cache-Control', `public, max-age=${ttlSeconds}, immutable`);

    // Check If-None-Match for ETag validation
    const ifNoneMatch = req.headers['if-none-match'];

    // Attach helper to check ETag early (used by thumbnail route)
    res.checkETag = (etag) => {
      if (ifNoneMatch && ifNoneMatch === etag) {
        res.status(304).end();
        return true;
      }
      res.setHeader('ETag', etag);
      return false;
    };

    next();
  };
}

/**
 * Generate ETag from file stats (mtime + size)
 * @param {fs.Stats} stats - File stats object
 * @returns {string} ETag string
 */
function generateETag(stats) {
  const mtime = stats.mtimeMs || stats.mtime.getTime();
  const size = stats.size;
  return `"${mtime.toString(16)}-${size.toString(16)}"`;
}

/**
 * Middleware for static file ETag support based on file mtime.
 * @param {string} filePath - Absolute path to the file
 */
function fileETagMiddleware(filePath) {
  return (req, res, next) => {
    fs.stat(filePath, (err, stats) => {
      if (err) return next();

      const etag = generateETag(stats);
      const ifNoneMatch = req.headers['if-none-match'];

      res.setHeader('ETag', etag);
      res.setHeader('Last-Modified', stats.mtime.toUTCString());

      if (ifNoneMatch && ifNoneMatch === etag) {
        return res.status(304).end();
      }

      const ifModifiedSince = req.headers['if-modified-since'];
      if (ifModifiedSince) {
        const modifiedSince = new Date(ifModifiedSince);
        if (stats.mtime <= modifiedSince) {
          return res.status(304).end();
        }
      }

      next();
    });
  };
}

module.exports = { cacheMiddleware, generateETag, fileETagMiddleware };