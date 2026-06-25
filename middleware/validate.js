const { fromFile } = require('file-type');
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
    return next(Object.assign(new Error('No file was uploaded. Please attach an image with field name "image".'), { status: 400 }));
  }

  const filePath = req.file.path;

  try {
    const type = await fromFile(filePath);

    if (!type || !ALLOWED_MIME_TYPES.has(type.mime)) {
      await safeDelete(filePath);
      const detectedMime = type ? type.mime : 'unknown';
      const err = new Error(`File magic bytes indicate unsupported type: ${detectedMime}. Only image files are accepted.`);
      err.status = 400;
      err.code = 'INVALID_FILE_CONTENT';
      return next(err);
    }

    // Attach the verified MIME type to the file object
    req.file.verifiedMimeType = type.mime;

    next();
  } catch (err) {
    await safeDelete(filePath);
    err.status = 500;
    err.message = `File validation failed: ${err.message}`;
    next(err);
  }
}

module.exports = validateUpload;