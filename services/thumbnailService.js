const path = require('path');
const sharp = require('sharp');
const { ensureDir, safeDelete } = require('../utils/fileHelpers');

const THUMBNAILS_BASE = path.join(__dirname, '..', 'uploads', 'thumbnails');

const THUMBNAIL_CONFIGS = [
  {
    size: '400',
    width: 400,
    height: 400,
    fit: 'cover',
    position: 'centre',
  },
  {
    size: '1200',
    width: 1200,
    height: 800,
    fit: 'inside',
    withoutEnlargement: true,
  },
];

/**
 * Generate WebP thumbnails for an uploaded image.
 * @param {string} filePath - Absolute path to the source image
 * @param {string|number} imageId - The image's DB id (used for output filename)
 * @returns {Promise<{ thumb400: string, thumb1200: string }>} Absolute paths to generated thumbnails
 */
async function generateThumbnails(filePath, imageId) {
  const results = {};

  for (const config of THUMBNAIL_CONFIGS) {
    const thumbDir = path.join(THUMBNAILS_BASE, config.size);
    await ensureDir(thumbDir);

    const outputPath = path.join(thumbDir, `${imageId}.webp`);

    try {
      const resizeOptions = {
        width: config.width,
        height: config.height,
        fit: config.fit,
      };

      if (config.position) {
        resizeOptions.position = config.position;
      }

      if (config.withoutEnlargement) {
        resizeOptions.withoutEnlargement = true;
      }

      await sharp(filePath)
        .rotate() // Auto-rotate based on EXIF orientation
        .resize(resizeOptions)
        .webp({
          quality: 85,
          effort: 4,
        })
        .toFile(outputPath);

      results[`thumb${config.size}`] = outputPath;
    } catch (err) {
      console.error(
        `[thumbnailService] Failed to generate ${config.size}px thumbnail for image ${imageId}:`,
        err.message
      );
      // Don't throw — partial failure is acceptable
      results[`thumb${config.size}`] = null;
    }
  }

  return results;
}

/**
 * Delete all thumbnail files for a given image id.
 * @param {string|number} imageId
 */
async function deleteThumbnails(imageId) {
  for (const config of THUMBNAIL_CONFIGS) {
    const thumbPath = path.join(THUMBNAILS_BASE, config.size, `${imageId}.webp`);
    await safeDelete(thumbPath);
  }
}

module.exports = { generateThumbnails, deleteThumbnails };