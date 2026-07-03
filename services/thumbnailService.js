const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const { ThumbnailCache } = require('../models');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
const THUMBNAILS_DIR = path.join(UPLOADS_DIR, 'thumbnails');

const THUMBNAIL_SIZES = {
  small: { width: 150, height: 150 },
  medium: { width: 400, height: 400 },
  large: { width: 800, height: 800 }
};

/**
 * Ensure thumbnail directories exist
 */
function ensureDirs() {
  for (const size of Object.keys(THUMBNAIL_SIZES)) {
    const dir = path.join(THUMBNAILS_DIR, size);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

/**
 * Generate thumbnails for an image, applying non-destructive rotation
 * @param {string} originalPath - Full path to original image
 * @param {string} filename - Original filename
 * @param {object} options - { rotation: 0|90|180|270 }
 */
async function generateThumbnails(originalPath, filename, options = {}) {
  ensureDirs();

  const rotation = options.rotation || 0;
  const results = {};

  for (const [size, dimensions] of Object.entries(THUMBNAIL_SIZES)) {
    try {
      const thumbDir = path.join(THUMBNAILS_DIR, size);
      const thumbPath = path.join(thumbDir, filename);

      let pipeline = sharp(originalPath)
        .withMetadata();

      // Apply rotation if needed
      if (rotation !== 0) {
        pipeline = pipeline.rotate(rotation);
      }

      pipeline = pipeline
        .resize(dimensions.width, dimensions.height, {
          fit: 'inside',
          withoutEnlargement: true
        });

      await pipeline.toFile(thumbPath);
      results[size] = thumbPath;
    } catch (err) {
      console.error(`Failed to generate ${size} thumbnail for ${filename}:`, err);
    }
  }

  return results;
}

/**
 * Get or generate a thumbnail, returning the path
 * @param {object} image - Image model instance
 * @param {string} size - 'small'|'medium'|'large'
 */
async function getThumbnail(image, size = 'medium') {
  if (!THUMBNAIL_SIZES[size]) {
    throw new Error(`Invalid thumbnail size: ${size}`);
  }

  const originalPath = path.join(UPLOADS_DIR, image.filename);
  const thumbDir = path.join(THUMBNAILS_DIR, size);
  const thumbPath = path.join(thumbDir, image.filename);

  // Check if thumbnail exists and is fresh
  if (fs.existsSync(thumbPath)) {
    const origStat = fs.statSync(originalPath);
    const thumbStat = fs.statSync(thumbPath);

    // If original is newer than thumbnail OR rotation changed, regenerate
    if (origStat.mtime <= thumbStat.mtime) {
      return thumbPath;
    }
  }

  // Generate thumbnails
  await generateThumbnails(originalPath, image.filename, {
    rotation: image.rotation || 0
  });

  return thumbPath;
}

module.exports = { generateThumbnails, getThumbnail, THUMBNAIL_SIZES, THUMBNAILS_DIR };