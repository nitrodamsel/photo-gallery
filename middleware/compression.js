const compression = require('compression');

/**
 * Compression middleware configured for production use.
 * Excludes already-compressed image formats.
 * Threshold: 1KB — don't compress responses smaller than this.
 */
const alreadyCompressedMimeTypes = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/avif',
  'image/bmp',
  'image/tiff',
  'video/mp4',
  'video/webm',
  'audio/mpeg',
  'audio/ogg',
  'application/zip',
  'application/gzip',
  'application/x-gzip',
  'application/x-bzip2',
  'application/x-7z-compressed',
  'application/x-rar-compressed',
]);

function shouldCompress(req, res) {
  const contentType = res.getHeader('Content-Type') || '';
  const mimeType = contentType.split(';')[0].trim().toLowerCase();

  if (alreadyCompressedMimeTypes.has(mimeType)) {
    return false;
  }

  // Use default compression filter for everything else
  return compression.filter(req, res);
}

const compressionMiddleware = compression({
  threshold: 1024, // 1KB
  filter: shouldCompress,
  level: 6, // zlib compression level (1-9, default 6 is a good balance)
});

module.exports = compressionMiddleware;