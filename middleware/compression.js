const compression = require('compression');

/**
 * Already-compressed file formats that should not be re-compressed.
 * Attempting to compress these wastes CPU without size benefit.
 */
const SKIP_COMPRESSION_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/avif',
  'image/svg+xml',
  'video/mp4',
  'video/webm',
  'audio/mpeg',
  'audio/ogg',
  'application/zip',
  'application/gzip',
  'application/x-gzip',
  'application/x-bzip2',
  'application/x-7z-compressed',
  'application/pdf',
]);

/**
 * Filter function: skip compression for already-compressed formats.
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @returns {boolean} Whether to compress
 */
function compressionFilter(req, res) {
  const contentType = res.getHeader('Content-Type') || '';
  const mimeType = contentType.split(';')[0].trim().toLowerCase();

  if (SKIP_COMPRESSION_TYPES.has(mimeType)) {
    return false;
  }

  // Use default compression filter for everything else
  return compression.filter(req, res);
}

/**
 * Configured compression middleware.
 * - threshold: 1KB minimum response size to compress
 * - level: zlib compression level (6 is a good balance)
 * - filter: skips already-compressed formats
 */
const compressionMiddleware = compression({
  threshold: 1024, // 1KB
  level: 6,
  filter: compressionFilter,
  // Use gzip/deflate/brotli depending on Accept-Encoding
  strategy: 0, // Z_DEFAULT_STRATEGY
});

module.exports = compressionMiddleware;