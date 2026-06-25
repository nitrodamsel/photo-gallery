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
  if (!req.file) {
    const err = new Error('No file uploaded. Please attach an image with field name "image".');
    err.status = 400;
    return next(err);
  }

  try {
    const fileTypeResult = await fileTypeFromFile(req.file.path);

    if (!fileTypeResult || !ALLOWED_MIME_TYPES.has(fileTypeResult.mime)) {
      await safeDelete(req.file.path);
      const err = new Error(
        `Invalid file content. Magic bytes do not match an allowed image type. Detected: ${
          fileTypeResult ? fileTypeResult.mime : 'unknown'
        }`
      );
      err.status = 415;
      return next(err);
    }

    // Attach the verified mime type to the file object
    req.file.verifiedMimeType = fileTypeResult.mime;
    next();
  } catch (error) {
    await safeDelete(req.file.path);
    const err = new Error(`Failed to validate file type: ${error.message}`);
    err.status = 500;
    next(err);
  }
}

module.exports = validateUpload;