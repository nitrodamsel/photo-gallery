const { fileTypeFromFile } = require('file-type');
const { safeDelete } = require('../utils/fileHelpers');

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/tiff',
  'image/heic',
  'image/heif',
];

async function validateUpload(req, res, next) {
  // Check that a file was actually attached
  if (!req.file) {
    const err = new Error('No file uploaded. Please attach an image with field name "image".');
    err.status = 400;
    err.code = 'NO_FILE';
    return next(err);
  }

  const filePath = req.file.path;

  try {
    // Re-validate MIME type using magic bytes (file-type reads actual file content)
    const detected = await fileTypeFromFile(filePath);

    if (!detected || !ALLOWED_MIME_TYPES.includes(detected.mime)) {
      await safeDelete(filePath);
      const err = new Error(
        `File content validation failed. Detected type: ${detected ? detected.mime : 'unknown'}. Allowed: JPEG, PNG, WebP, TIFF, HEIC`
      );
      err.status = 400;
      err.code = 'INVALID_FILE_CONTENT';
      return next(err);
    }

    // Update req.file with the magic-byte-detected MIME type for downstream use
    req.file.detectedMimeType = detected.mime;
    next();
  } catch (err) {
    await safeDelete(filePath);
    err.status = 500;
    err.code = 'VALIDATION_ERROR';
    next(err);
  }
}

module.exports = validateUpload;