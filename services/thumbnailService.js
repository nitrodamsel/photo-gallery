const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

const uploadsDir = path.join(__dirname, '..', 'uploads');
const thumbnailsDir = path.join(uploadsDir, 'thumbnails');

// Ensure thumbnails directory exists
if (!fs.existsSync(thumbnailsDir)) {
  fs.mkdirSync(thumbnailsDir, { recursive: true });
}

const THUMBNAIL_SIZES = {
  small: { width: 200, height: 200 },
  medium: { width: 400, height: 400 },
  large: { width: 800, height: 800 }
};

/**
 * Apply rotation to a sharp instance.
 * @param {sharp.Sharp} sharpInstance
 * @param {number} rotation  0 | 90 | 180 | 270
 * @returns {sharp.Sharp}
 */
function applyRotation(sharpInstance, rotation) {
  const rot = parseInt(rotation, 10) || 0;
  if (rot === 0) return sharpInstance;
  return sharpInstance.rotate(rot);
}

/**
 * Generate thumbnails for an image file.
 * @param {string} originalPath  Absolute path to original image
 * @param {string} filename      Basename of the file (used to name thumbs)
 * @param {object} options
 * @param {number} [options.rotation=0]  Rotation to apply (0/90/180/270)
 * @returns {Promise<object>}  Map of size -> thumbnail path
 */
async function generateThumbnails(originalPath, filename, options = {}) {
  const { rotation = 0 } = options;
  const ext = path.extname(filename);
  const base = path.basename(filename, ext);

  const results = {};

  for (const [size, dimensions] of Object.entries(THUMBNAIL_SIZES)) {
    const thumbFilename = `${base}_${size}.webp`;
    const thumbPath = path.join(thumbnailsDir, thumbFilename);

    let pipeline = sharp(originalPath)
      .rotate() // auto-rotate based on EXIF orientation first
      ;

    pipeline = applyRotation(pipeline, rotation);

    await pipeline
      .resize(dimensions.width, dimensions.height, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .webp({ quality: 85 })
      .toFile(thumbPath);

    results[size] = thumbPath;
  }

  return results;
}

/**
 * Get the path for a specific thumbnail size.
 * @param {string} filename
 * @param {string} size  small | medium | large
 * @returns {string}
 */
function getThumbnailPath(filename, size) {
  const ext = path.extname(filename);
  const base = path.basename(filename, ext);
  return path.join(thumbnailsDir, `${base}_${size}.webp`);
}

/**
 * Check if thumbnails exist for a given filename.
 * @param {string} filename
 * @returns {boolean}
 */
function thumbnailsExist(filename) {
  return Object.keys(THUMBNAIL_SIZES).every(size => {
    return fs.existsSync(getThumbnailPath(filename, size));
  });
}

module.exports = { generateThumbnails, getThumbnailPath, thumbnailsExist, THUMBNAIL_SIZES };