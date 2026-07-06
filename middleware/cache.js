const fs = require('fs');

/**
 * Express middleware factory for HTTP caching with ETag support.
 * @param {number} ttlSeconds - Cache-Control max-age value in seconds
 */
function cacheMiddleware(ttlSeconds = 31536000) {
  return function (req, res, next) {
    // Store original send to intercept
    const originalSendFile = res.sendFile.bind(res);

    res.sendFile = function (filePath, options, callback) {
      try {
        const stat = fs.statSync(filePath);
        const mtime = stat.mtime.getTime();
        const etag = `"${mtime.toString(16)}-${stat.size.toString(16)}"`;

        res.setHeader('ETag', etag);
        res.setHeader('Cache-Control', `public, max-age=${ttlSeconds}, immutable`);
        res.setHeader('Last-Modified', stat.mtime.toUTCString());

        const ifNoneMatch = req.headers['if-none-match'];
        const ifModifiedSince = req.headers['if-modified-since'];

        if (ifNoneMatch && ifNoneMatch === etag) {
          res.status(304).end();
          return;
        }

        if (!ifNoneMatch && ifModifiedSince) {
          const ifModifiedSinceDate = new Date(ifModifiedSince).getTime();
          if (mtime <= ifModifiedSinceDate) {
            res.status(304).end();
            return;
          }
        }

        originalSendFile(filePath, options, callback);
      } catch (err) {
        // File doesn't exist or can't be stat'd, let next handler deal with it
        originalSendFile(filePath, options, callback);
      }
    };

    next();
  };
}

/**
 * Middleware to set ETag and Cache-Control for a given file path.
 * Use this directly on routes that serve files.
 */
function setFileHeaders(filePath, res, ttlSeconds = 31536000) {
  try {
    const stat = fs.statSync(filePath);
    const mtime = stat.mtime.getTime();
    const etag = `"${mtime.toString(16)}-${stat.size.toString(16)}"`;

    res.setHeader('ETag', etag);
    res.setHeader('Cache-Control', `public, max-age=${ttlSeconds}, immutable`);
    res.setHeader('Last-Modified', stat.mtime.toUTCString());

    return etag;
  } catch (err) {
    return null;
  }
}

/**
 * Check if the request can be served with 304 Not Modified.
 * @returns {boolean} true if 304 was sent
 */
function checkNotModified(req, res, etag) {
  if (!etag) return false;

  const ifNoneMatch = req.headers['if-none-match'];
  if (ifNoneMatch && ifNoneMatch === etag) {
    res.status(304).end();
    return true;
  }

  return false;
}

module.exports = { cacheMiddleware, setFileHeaders, checkNotModified };