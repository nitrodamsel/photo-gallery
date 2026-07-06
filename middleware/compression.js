const compression = require('compression');

/**
 * Already-compressed MIME types that should not be re-compressed.
 */
const COMPRESSED_TYPES = [
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
  'application/zip',
  'application/gzip',
  'application/x-gzip',
  'application/x-bzip2',
  'application/x-7z-compressed',
  'application/x-rar-compressed',
];

/**
 * Filter function that excludes already-compressed formats from compression.
 */
function shouldCompress(req, res) {
  const contentType = res.getHeader('Content-Type') || '';
  const mimeType = contentType.split(';')[0].trim().toLowerCase();

  if (COMPRESSED_TYPES.includes(mimeType)) {
    return false;
  }

  // Use default compression filter for everything else
  return compression.filter(req, res);
}

/**
 * Configured compression middleware.
 * - threshold: 1KB minimum size before compressing
 * - filter: excludes already-compressed image/video/archive formats
 * - level: balanced compression (6 is zlib default)
 */
const compressionMiddleware = compression({
  threshold: 1024, // 1KB
  filter: shouldCompress,
  level: 6,
  memLevel: 8,
  windowBits: 15,
});

module.exports = compressionMiddleware;