const path = require('path');
const sharp = require('sharp');
const { ensureDir, safeDelete } = require('../utils/fileHelpers');

const THUMBNAILS_BASE = path.join(__dirname, '..', 'uploads', 'thumbnails');

const THUMBNAIL_CONFIGS = [
  {
    key: 'thumb400',
    size: 400,
    dir: '400',
    width: 400,
    height: 400,
    fit: 'cover',
  },
  {
    key: 'thumb1200',
    size: 1200,
    dir: '1200',
    width: 1200,
    height: 800,
    fit: 'inside',
  },
];

/**
 * Generate webp thumbnails for an uploaded image.
 * @param {string} filePath - Absolute path to the source image
 * @param {string|number} imageId - The image's DB ID (used as filename)
 * @returns {Promise<{ thumb400: string, thumb1200: string }>} Absolute paths to thumbnails
 */
async function generateThumbnails(filePath, imageId) {
  const results = {};

  for (const config of THUMBNAIL_CONFIGS) {
    const outDir = path.join(THUMBNAILS_BASE, config.dir);
    await ensureDir(outDir);

    const outPath = path.join(outDir, `${imageId}.webp`);

    try {
      await sharp(filePath)
        .resize({
          width: config.width,
          height: config.height,
          fit: config.fit,
          withoutEnlargement: true,
        })
        .webp({ quality: 85 })
        .toFile(outPath);

      results[config.key] = outPath;
      console.log(`[thumbnailService] Generated ${config.key} for image ${imageId} → ${outPath}`);
    } catch (err) {
      console.error(
        `[thumbnailService] Failed to generate ${config.key} for image ${imageId}:`,
        err.message
      );
      results[config.key] = null;
    }
  }

  return results;
}

/**
 * Delete all thumbnails for a given image ID.
 * @param {string|number} imageId
 */
async function deleteThumbnails(imageId) {
  for (const config of THUMBNAIL_CONFIGS) {
    const thumbPath = path.join(THUMBNAILS_BASE, config.dir, `${imageId}.webp`);
    await safeDelete(thumbPath);
  }
}

module.exports = { generateThumbnails, deleteThumbnails };