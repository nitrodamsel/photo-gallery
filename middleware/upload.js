const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/tiff',
  'image/heic',
  'image/heif',
];

const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE_MB || '20', 10) * 1024 * 1024;

function getDateSubdir() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const subdir = getDateSubdir();
    const destPath = path.join(__dirname, '..', 'uploads', 'originals', subdir);
    fs.mkdirSync(destPath, { recursive: true });
    cb(null, destPath);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const uniqueName = `${uuidv4()}${ext}`;
    cb(null, uniqueName);
  },
});

function fileFilter(req, file, cb) {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    const err = new Error(`Unsupported file type: ${file.mimetype}. Allowed types: jpeg, png, webp, tiff, heic.`);
    err.status = 400;
    err.code = 'UNSUPPORTED_FILE_TYPE';
    cb(err, false);
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
});

module.exports = upload;