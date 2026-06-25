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
    return next(Object.assign(new Error('No file was uploaded. Please attach an image.'), { status: 400 }));
  }

  const filePath = req.file.path;

  try {
    const detected = await fileTypeFromFile(filePath);

    if (!detected || !ALLOWED_MIME_TYPES.has(detected.mime)) {
      await safeDelete(filePath);
      const mime = detected ? detected.mime : 'unknown';
      return next(
        Object.assign(
          new Error(`File content validation failed. Detected MIME type '${mime}' is not allowed.`),
          { status: 400, code: 'INVALID_FILE_CONTENT' }
        )
      );
    }

    // Update mimetype with the magic-byte-detected value for accuracy
    req.file.detectedMime = detected.mime;
    next();
  } catch (err) {
    await safeDelete(filePath);
    next(Object.assign(new Error('File validation error: ' + err.message), { status: 500 }));
  }
}

module.exports = validateUpload;