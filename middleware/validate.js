const { fromFile } = require('file-type');
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
  if (!req.file) {
    return next(Object.assign(new Error('No file uploaded. Please attach an image.'), { status: 400 }));
  }

  try {
    const fileTypeResult = await fromFile(req.file.path);

    if (!fileTypeResult || !ALLOWED_MIME_TYPES.includes(fileTypeResult.mime)) {
      await safeDelete(req.file.path);
      const err = new Error(
        `Invalid file content. Magic bytes do not match an allowed image type. Detected: ${
          fileTypeResult ? fileTypeResult.mime : 'unknown'
        }`
      );
      err.status = 422;
      return next(err);
    }

    // Attach the verified mime type back onto the file object
    req.file.verifiedMimeType = fileTypeResult.mime;
    next();
  } catch (error) {
    await safeDelete(req.file.path);
    next(error);
  }
}

module.exports = validateUpload;