const path = require('path');
const sharp = require('sharp');
const { ensureDir, safeDelete } = require('../utils/fileHelpers');

const THUMBNAILS_BASE = path.join(__dirname, '..', 'uploads', 'thumbnails');

const THUMB_SIZES = {
  400: { width: 400, height: 400, fit: 'cover' },
  1200: { width: 1200, height: 800, fit: 'inside' },
};

/**
 * Generates thumbnails for an uploaded image.
 * @param {string} filePath - Absolute path to the original image.
 * @param {string|number} imageId - The image's database ID (used for naming).
 * @returns {Promise<{ thumb400: string, thumb1200: string }>} Absolute paths to thumbnails.
 */
async function generateThumbnails(filePath, imageId) {
  const results = {};

  for (const [size, config] of Object.entries(THUMB_SIZES)) {
    const thumbDir = path.join(THUMBNAILS_BASE, String(size));
    await ensureDir(thumbDir);

    const thumbPath = path.join(thumbDir, `${imageId}.webp`);

    try {
      await sharp(filePath)
        .resize(config.width, config.height, {
          fit: config.fit,
          withoutEnlargement: true,
        })
        .webp({ quality: 85 })
        .toFile(thumbPath);

      results[`thumb${size}`] = thumbPath;
    } catch (err) {
      console.error(
        `[thumbnailService] Failed to generate ${size}px thumbnail for image ${imageId}:`,
        err.message
      );
      // Don't throw — partial failure is acceptable
    }
  }

  return results;
}

/**
 * Deletes all thumbnails for a given image ID.
 * @param {string|number} imageId
 */
async function deleteThumbnails(imageId) {
  const deletePromises = Object.keys(THUMB_SIZES).map((size) => {
    const thumbPath = path.join(THUMBNAILS_BASE, String(size), `${imageId}.webp`);
    return safeDelete(thumbPath);
  });

  await Promise.all(deletePromises);
}

module.exports = {
  generateThumbnails,
  deleteThumbnails,
};