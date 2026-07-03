const path = require('path');
const fs = require('fs');
const { Image, Tag, ImageTag, ThumbnailCache } = require('../models');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
const THUMBNAILS_DIR = path.join(UPLOADS_DIR, 'thumbnails');

/**
 * Delete an image and all associated files + DB records
 * @param {Image} image - Sequelize Image instance
 */
async function deleteImage(image) {
  // Delete original file
  const originalPath = path.join(UPLOADS_DIR, image.filename);
  if (fs.existsSync(originalPath)) {
    fs.unlinkSync(originalPath);
  }

  // Delete thumbnail files
  const thumbnailSizes = ['small', 'medium', 'large'];
  for (const size of thumbnailSizes) {
    const thumbPath = path.join(THUMBNAILS_DIR, size, image.filename);
    if (fs.existsSync(thumbPath)) {
      fs.unlinkSync(thumbPath);
    }
    // Also try webp variants
    const webpFilename = image.filename.replace(/\.[^.]+$/, '.webp');
    const thumbWebpPath = path.join(THUMBNAILS_DIR, size, webpFilename);
    if (fs.existsSync(thumbWebpPath)) {
      fs.unlinkSync(thumbWebpPath);
    }
  }

  // Delete thumbnail cache records
  await ThumbnailCache.destroy({ where: { imageId: image.id } });

  // Delete image-tag associations
  await ImageTag.destroy({ where: { imageId: image.id } });

  // Delete the image record
  await image.destroy();
}

/**
 * Get image with tags
 * @param {number} id
 */
async function getImageWithTags(id) {
  return Image.findByPk(id, {
    include: [{ model: Tag, as: 'tags', through: { attributes: [] } }]
  });
}

module.exports = { deleteImage, getImageWithTags };