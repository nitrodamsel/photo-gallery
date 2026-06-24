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
  if (!req.file) {
    return next(Object.assign(new Error('No file was uploaded. Please attach a file with field name "image".'), { status: 400 }));
  }

  let detectedType;
  try {
    detectedType = await fileTypeFromFile(req.file.path);
  } catch (err) {
    await safeDelete(req.file.path);
    return next(Object.assign(new Error('Could not read uploaded file to determine its type.'), { status: 400 }));
  }

  if (!detectedType || !ALLOWED_MIME_TYPES.includes(detectedType.mime)) {
    await safeDelete(req.file.path);
    const detected = detectedType ? detectedType.mime : 'unknown';
    return next(
      Object.assign(
        new Error(`File type validation failed. Detected MIME type: ${detected}. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`),
        { status: 400, code: 'INVALID_FILE_TYPE' }
      )
    );
  }

  // Attach detected mime to the file object for downstream use
  req.file.detectedMime = detectedType.mime;
  next();
}

module.exports = validateUpload;