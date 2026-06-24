const path = require('path');
const sharp = require('sharp');
const { ensureDir, safeDelete } = require('../utils/fileHelpers');

const THUMBNAILS_BASE = path.join(__dirname, '..', 'uploads', 'thumbnails');

const THUMBNAIL_SIZES = {
  thumb400: {
    dir: '400',
    width: 400,
    height: 400,
    fit: 'cover',
  },
  thumb1200: {
    dir: '1200',
    width: 1200,
    height: 800,
    fit: 'inside',
  },
};

/**
 * Generate thumbnails for a given image file.
 * @param {string} filePath - Absolute path to the source image
 * @param {string|number} imageId - Image ID used for naming thumbnail files
 * @returns {Promise<{ thumb400: string, thumb1200: string }>} Absolute paths to generated thumbnails
 */
async function generateThumbnails(filePath, imageId) {
  const results = {};

  for (const [key, config] of Object.entries(THUMBNAIL_SIZES)) {
    const thumbDir = path.join(THUMBNAILS_BASE, config.dir);
    await ensureDir(thumbDir);

    const thumbPath = path.join(thumbDir, `${imageId}.webp`);

    try {
      await sharp(filePath)
        .rotate() // Auto-rotate based on EXIF orientation
        .resize({
          width: config.width,
          height: config.height,
          fit: config.fit,
          withoutEnlargement: true,
        })
        .webp({ quality: 82, effort: 4 })
        .toFile(thumbPath);

      results[key] = thumbPath;
    } catch (err) {
      console.error(`[thumbnailService] Failed to generate ${key} for image ${imageId}:`, err.message);
      // Don't throw — partial failure is acceptable
      results[key] = null;
    }
  }

  return results;
}

/**
 * Delete all thumbnails for a given image ID.
 * @param {string|number} imageId
 */
async function deleteThumbnails(imageId) {
  const deletions = Object.values(THUMBNAIL_SIZES).map(async (config) => {
    const thumbPath = path.join(THUMBNAILS_BASE, config.dir, `${imageId}.webp`);
    await safeDelete(thumbPath);
  });

  await Promise.allSettled(deletions);
}

module.exports = { generateThumbnails, deleteThumbnails };