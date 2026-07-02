const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const { ThumbnailCache } = require('../models');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
const THUMBS_DIR = path.join(UPLOADS_DIR, 'thumbnails');

const THUMBNAIL_SIZES = {
  small: { width: 150, height: 150 },
  medium: { width: 400, height: 400 },
  large: { width: 800, height: 800 }
};

// Ensure thumbnails directory exists
if (!fs.existsSync(THUMBS_DIR)) {
  fs.mkdirSync(THUMBS_DIR, { recursive: true });
}

/**
 * Convert rotation degrees to Sharp rotation value.
 * @param {number} rotation - 0, 90, 180, 270
 * @returns {number}
 */
function getSharpRotation(rotation) {
  const validRotations = [0, 90, 180, 270];
  if (!validRotations.includes(rotation)) return 0;
  return rotation;
}

/**
 * Generate all thumbnail sizes for an image with optional rotation.
 * @param {string} filename
 * @param {number} rotation - 0, 90, 180, 270
 * @returns {Promise<object>} - paths to generated thumbnails
 */
async function generateThumbnails(filename, rotation = 0) {
  const originalPath = path.join(UPLOADS_DIR, filename);

  if (!fs.existsSync(originalPath)) {
    throw new Error(`Original file not found: ${originalPath}`);
  }

  const baseName = path.parse(filename).name;
  const results = {};
  const sharpRotation = getSharpRotation(rotation);

  for (const [size, dimensions] of Object.entries(THUMBNAIL_SIZES)) {
    const thumbFilename = `${baseName}-${size}.jpg`;
    const thumbPath = path.join(THUMBS_DIR, thumbFilename);

    let pipeline = sharp(originalPath);

    // Apply rotation if needed (non-destructive — only applied to thumbnail)
    if (sharpRotation !== 0) {
      pipeline = pipeline.rotate(sharpRotation);
    }

    await pipeline
      .resize(dimensions.width, dimensions.height, {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ quality: 85, progressive: true })
      .toFile(thumbPath);

    results[size] = thumbFilename;

    // Update cache record
    try {
      const image = await require('../models').Image.findOne({ where: { filename } });
      if (image) {
        await ThumbnailCache.upsert({
          imageId: image.id,
          size,
          filename: thumbFilename,
          width: dimensions.width,
          height: dimensions.height
        });
      }
    } catch (err) {
      console.error('Error updating thumbnail cache:', err);
    }
  }

  return results;
}

/**
 * Get thumbnail path for a given image filename and size.
 * @param {string} filename
 * @param {string} size - small, medium, large
 * @returns {string}
 */
function getThumbnailPath(filename, size = 'medium') {
  const baseName = path.parse(filename).name;
  return path.join(THUMBS_DIR, `${baseName}-${size}.jpg`);
}

/**
 * Check if thumbnails exist for an image.
 * @param {string} filename
 * @returns {boolean}
 */
function thumbnailsExist(filename) {
  return Object.keys(THUMBNAIL_SIZES).every(size => {
    return fs.existsSync(getThumbnailPath(filename, size));
  });
}

module.exports = { generateThumbnails, getThumbnailPath, thumbnailsExist, THUMBNAIL_SIZES };