const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const ThumbnailCache = require('../models/ThumbnailCache');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
const THUMB_DIR = path.join(UPLOAD_DIR, 'thumbnails');

const SIZES = {
  small: { width: 200, height: 200 },
  medium: { width: 400, height: 400 },
  large: { width: 800, height: 800 }
};

/**
 * Ensure thumbnail directories exist
 */
function ensureThumbDirs() {
  for (const size of Object.keys(SIZES)) {
    const dir = path.join(THUMB_DIR, size);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

/**
 * Apply rotation to a sharp instance
 * @param {sharp.Sharp} sharpInstance
 * @param {number} rotation - 0, 90, 180, 270, or special values for flip
 * @returns {sharp.Sharp}
 */
function applyRotation(sharpInstance, rotation) {
  if (!rotation) return sharpInstance;

  // Handle special flip values
  if (rotation === 'flipH' || rotation === -1) {
    return sharpInstance.flop(); // horizontal flip
  }
  if (rotation === 'flipV' || rotation === -2) {
    return sharpInstance.flip(); // vertical flip
  }

  // Handle degree rotations
  const degrees = parseInt(rotation, 10);
  if (degrees && degrees !== 0) {
    return sharpInstance.rotate(degrees);
  }

  return sharpInstance;
}

/**
 * Generate thumbnails for an image
 * @param {string} filePath - Full path to original image
 * @param {string} filename - Just the filename
 * @param {number} rotation - Rotation value to apply
 */
async function generateThumbnails(filePath, filename, rotation = 0) {
  ensureThumbDirs();

  const results = {};

  for (const [size, dimensions] of Object.entries(SIZES)) {
    const thumbPath = path.join(THUMB_DIR, size, filename);

    try {
      let pipeline = sharp(filePath);
      pipeline = applyRotation(pipeline, rotation);
      pipeline = pipeline.resize(dimensions.width, dimensions.height, {
        fit: 'inside',
        withoutEnlargement: true
      });

      await pipeline
        .jpeg({ quality: 85, progressive: true })
        .toFile(thumbPath);

      results[size] = thumbPath;
    } catch (err) {
      console.error(`Failed to generate ${size} thumbnail for ${filename}:`, err);
      throw err;
    }
  }

  return results;
}

/**
 * Get thumbnail path for a given image and size
 * @param {string} filename
 * @param {string} size - small, medium, large
 */
function getThumbnailPath(filename, size = 'medium') {
  return path.join(THUMB_DIR, size, filename);
}

/**
 * Check if thumbnail exists
 * @param {string} filename
 * @param {string} size
 */
function thumbnailExists(filename, size = 'medium') {
  const thumbPath = getThumbnailPath(filename, size);
  return fs.existsSync(thumbPath);
}

module.exports = {
  generateThumbnails,
  getThumbnailPath,
  thumbnailExists,
  applyRotation,
  ensureThumbDirs,
  SIZES,
  THUMB_DIR
};