const path = require('path');
const sharp = require('sharp');
const { ensureDir, safeDelete } = require('../utils/fileHelpers');

const THUMB_BASE = path.join(__dirname, '..', 'uploads', 'thumbnails');

const THUMBNAIL_CONFIGS = [
  {
    name: '400',
    width: 400,
    height: 400,
    fit: 'cover',
  },
  {
    name: '1200',
    width: 1200,
    height: 800,
    fit: 'inside',
  },
];

/**
 * Generates thumbnails for an uploaded image.
 * @param {string} filePath - Absolute path to the source image.
 * @param {string|number} imageId - The image's database ID (used for naming).
 * @returns {Promise<{ thumb400: string, thumb1200: string }>} Absolute paths to generated thumbnails.
 */
async function generateThumbnails(filePath, imageId) {
  const results = {};

  for (const config of THUMBNAIL_CONFIGS) {
    const thumbDir = path.join(THUMB_BASE, config.name);
    await ensureDir(thumbDir);

    const thumbPath = path.join(thumbDir, `${imageId}.webp`);

    await sharp(filePath)
      .resize(config.width, config.height, {
        fit: config.fit,
        withoutEnlargement: true,
      })
      .webp({ quality: 85 })
      .toFile(thumbPath);

    results[`thumb${config.name}`] = thumbPath;
  }

  return {
    thumb400: results['thumb400'],
    thumb1200: results['thumb1200'],
  };
}

/**
 * Deletes all thumbnail files for a given image ID.
 * @param {string|number} imageId
 */
async function deleteThumbnails(imageId) {
  for (const config of THUMBNAIL_CONFIGS) {
    const thumbPath = path.join(THUMB_BASE, config.name, `${imageId}.webp`);
    await safeDelete(thumbPath);
  }
}

module.exports = { generateThumbnails, deleteThumbnails };