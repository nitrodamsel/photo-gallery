const path = require('path');
const sharp = require('sharp');
const { ensureDir, safeDelete } = require('../utils/fileHelpers');

const THUMBNAILS_BASE = path.join(__dirname, '..', 'uploads', 'thumbnails');

const THUMBNAIL_SIZES = [
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
 * Generate WebP thumbnails for an uploaded image.
 *
 * @param {string} filePath - Absolute path to the original image
 * @param {string|number} imageId - The image's database ID (used for filename)
 * @returns {Promise<{ thumb400: string, thumb1200: string }>} Absolute paths to generated thumbnails
 */
async function generateThumbnails(filePath, imageId) {
  const results = {};

  for (const size of THUMBNAIL_SIZES) {
    const dir = path.join(THUMBNAILS_BASE, size.name);
    await ensureDir(dir);

    const outputPath = path.join(dir, `${imageId}.webp`);

    try {
      await sharp(filePath)
        .resize({
          width: size.width,
          height: size.height,
          fit: size.fit,
          withoutEnlargement: true,
        })
        .webp({ quality: 80 })
        .toFile(outputPath);

      results[`thumb${size.name}`] = outputPath;
      console.log(`[thumbnailService] Generated ${size.name}px thumbnail: ${outputPath}`);
    } catch (err) {
      console.error(
        `[thumbnailService] Failed to generate ${size.name}px thumbnail for image ${imageId}:`,
        err.message
      );
      // Don't re-throw — caller handles partial failures
    }
  }

  return {
    thumb400: results['thumb400'] || null,
    thumb1200: results['thumb1200'] || null,
  };
}

/**
 * Delete all thumbnails associated with an image ID.
 *
 * @param {string|number} imageId
 * @returns {Promise<void>}
 */
async function deleteThumbnails(imageId) {
  for (const size of THUMBNAIL_SIZES) {
    const thumbPath = path.join(THUMBNAILS_BASE, size.name, `${imageId}.webp`);
    await safeDelete(thumbPath);
  }
}

module.exports = { generateThumbnails, deleteThumbnails };