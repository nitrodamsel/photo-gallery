const path = require('path');
const sharp = require('sharp');
const { ensureDir, safeDelete } = require('../utils/fileHelpers');

const THUMBNAILS_BASE = path.join(__dirname, '..', 'uploads', 'thumbnails');

const THUMBNAIL_CONFIGS = [
  {
    name: 'thumb400',
    size: 400,
    dir: '400',
    width: 400,
    height: 400,
    fit: 'cover',
  },
  {
    name: 'thumb1200',
    size: 1200,
    dir: '1200',
    width: 1200,
    height: 800,
    fit: 'inside',
  },
];

/**
 * Generate WebP thumbnails for an uploaded image.
 * @param {string} filePath - Absolute path to the source image.
 * @param {string|number} imageId - The database ID of the image record.
 * @returns {Promise<{ thumb400: string, thumb1200: string }>} Absolute paths to generated thumbnails.
 */
async function generateThumbnails(filePath, imageId) {
  const results = {};

  for (const config of THUMBNAIL_CONFIGS) {
    const thumbDir = path.join(THUMBNAILS_BASE, config.dir);
    const thumbFilename = `${imageId}.webp`;
    const thumbPath = path.join(thumbDir, thumbFilename);

    try {
      await ensureDir(thumbDir);

      await sharp(filePath)
        .resize(config.width, config.height, {
          fit: config.fit,
          withoutEnlargement: true,
        })
        .webp({ quality: 85 })
        .toFile(thumbPath);

      results[config.name] = thumbPath;
    } catch (err) {
      console.error(
        `[thumbnailService] Failed to generate ${config.name} thumbnail for image ${imageId}: ${err.message}`
      );
      // Partial failure — log and continue, result key will be absent
    }
  }

  return results;
}

/**
 * Delete all thumbnails for a given image ID.
 * @param {string|number} imageId - The database ID of the image.
 */
async function deleteThumbnails(imageId) {
  for (const config of THUMBNAIL_CONFIGS) {
    const thumbPath = path.join(THUMBNAILS_BASE, config.dir, `${imageId}.webp`);
    await safeDelete(thumbPath);
  }
}

module.exports = { generateThumbnails, deleteThumbnails };