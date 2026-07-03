const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const { ThumbnailCache } = require('../models');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
const THUMB_DIR = path.join(UPLOADS_DIR, 'thumbnails');

const SIZES = {
  small: { width: 300, height: 300 },
  medium: { width: 800, height: 600 },
  large: { width: 1200, height: 900 }
};

/**
 * Ensure thumbnail directory exists
 */
function ensureThumbDir() {
  if (!fs.existsSync(THUMB_DIR)) {
    fs.mkdirSync(THUMB_DIR, { recursive: true });
  }
}

/**
 * Apply rotation to a sharp instance
 * @param {sharp.Sharp} sharpInstance
 * @param {number} rotation - 0, 90, 180, 270
 */
function applyRotation(sharpInstance, rotation) {
  if (!rotation || rotation === 0) return sharpInstance;
  return sharpInstance.rotate(rotation);
}

/**
 * Generate thumbnails for an image
 * @param {string} filePath - full path to original file
 * @param {string} filename - just the filename
 * @param {object} options - { rotation: 0|90|180|270 }
 */
async function generateThumbnails(filePath, filename, options = {}) {
  ensureThumbDir();

  const rotation = options.rotation || 0;
  const basename = path.parse(filename).name;
  const results = {};

  for (const [sizeName, dimensions] of Object.entries(SIZES)) {
    const thumbFilename = `${basename}_${sizeName}.jpg`;
    const thumbPath = path.join(THUMB_DIR, thumbFilename);

    let sharpInstance = sharp(filePath);

    // Apply rotation before resizing
    if (rotation !== 0) {
      sharpInstance = sharpInstance.rotate(rotation);
    }

    await sharpInstance
      .resize(dimensions.width, dimensions.height, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: 85 })
      .toFile(thumbPath);

    results[sizeName] = thumbFilename;
  }

  return results;
}

/**
 * Get or create thumbnail path for a given size
 * @param {string} filename
 * @param {string} size - 'small'|'medium'|'large'
 */
function getThumbnailPath(filename, size = 'small') {
  const basename = path.parse(filename).name;
  const thumbFilename = `${basename}_${size}.jpg`;
  const thumbPath = path.join(THUMB_DIR, thumbFilename);

  if (fs.existsSync(thumbPath)) {
    return thumbPath;
  }

  return null;
}

/**
 * Get thumbnail URL for a given filename and size
 */
function getThumbnailUrl(filename, size = 'small') {
  const basename = path.parse(filename).name;
  return `/uploads/thumbnails/${basename}_${size}.jpg`;
}

module.exports = {
  generateThumbnails,
  getThumbnailPath,
  getThumbnailUrl,
  SIZES,
  THUMB_DIR
};