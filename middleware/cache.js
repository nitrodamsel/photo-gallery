const fs = require('fs');

/**
 * Express middleware factory for HTTP caching with ETag support.
 * @param {number} ttlSeconds - Cache-Control max-age value in seconds
 */
function cacheMiddleware(ttlSeconds = 31536000) {
  return function (req, res, next) {
    // Store original methods to intercept
    const originalSendFile = res.sendFile.bind(res);

    res.sendFile = function (filePath, options, callback) {
      try {
        const stat = fs.statSync(filePath);
        const mtime = stat.mtime;
        const etag = `"${stat.size}-${mtime.getTime()}"`;

        res.setHeader('ETag', etag);
        res.setHeader('Cache-Control', `public, max-age=${ttlSeconds}, immutable`);
        res.setHeader('Last-Modified', mtime.toUTCString());

        const ifNoneMatch = req.headers['if-none-match'];
        if (ifNoneMatch && ifNoneMatch === etag) {
          return res.status(304).end();
        }

        const ifModifiedSince = req.headers['if-modified-since'];
        if (ifModifiedSince) {
          const ifModifiedDate = new Date(ifModifiedSince);
          if (mtime <= ifModifiedDate) {
            return res.status(304).end();
          }
        }
      } catch (err) {
        // File doesn't exist or can't be stat'd — let sendFile handle the error
      }

      return originalSendFile(filePath, options, callback);
    };

    next();
  };
}

module.exports = cacheMiddleware;