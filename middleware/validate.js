const { fileTypeFromFile } = require('file-type');
const { safeDelete } = require('../utils/fileHelpers');

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/tiff',
  'image/heic',
  'image/heif',
]);

async function validateUpload(req, res, next) {
  // Check a file was actually attached
  if (!req.file) {
    return next(Object.assign(new Error('No file uploaded. Please attach an image.'), { status: 400 }));
  }

  const filePath = req.file.path;

  try {
    // Re-validate MIME type via magic bytes (file-type reads file header)
    const detected = await fileTypeFromFile(filePath);

    if (!detected || !ALLOWED_MIME_TYPES.has(detected.mime)) {
      // Clean up the temp file before rejecting
      await safeDelete(filePath);
      const err = new Error(
        `Invalid file content. Detected type: ${detected ? detected.mime : 'unknown'}. ` +
        `Allowed types: JPEG, PNG, WebP, TIFF, HEIC.`
      );
      err.status = 415;
      err.code = 'INVALID_FILE_CONTENT';
      return next(err);
    }

    // Attach detected mime to file object for downstream use
    req.file.detectedMime = detected.mime;
    next();
  } catch (err) {
    await safeDelete(filePath).catch(() => {});
    err.status = err.status || 500;
    next(err);
  }
}

module.exports = validateUpload;