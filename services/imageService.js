const path = require('path');
const fs = require('fs');
const { Image, Tag, ImageTag, ThumbnailCache } = require('../models');
const thumbnailService = require('./thumbnailService');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
const THUMB_DIR = path.join(UPLOAD_DIR, 'thumbnails');

/**
 * Delete an image and all associated files and DB records
 */
async function deleteImage(imageId) {
  const image = await Image.findByPk(imageId);
  if (!image) throw new Error(`Image ${imageId} not found`);

  // Delete the original file
  const originalPath = path.join(UPLOAD_DIR, image.filename);
  if (fs.existsSync(originalPath)) {
    fs.unlinkSync(originalPath);
  }

  // Delete thumbnails
  try {
    await thumbnailService.deleteThumbnails(image);
  } catch (err) {
    console.error(`Failed to delete thumbnails for image ${imageId}:`, err);
  }

  // Delete image-tag associations
  await ImageTag.destroy({ where: { imageId } });

  // Delete thumbnail cache records
  await ThumbnailCache.destroy({ where: { imageId } });

  // Delete the image record
  await image.destroy();

  return true;
}

/**
 * Get image with all associations
 */
async function getImageWithTags(imageId) {
  return Image.findByPk(imageId, {
    include: [{ model: Tag, through: { attributes: [] } }]
  });
}

/**
 * Get paginated images
 */
async function getImages({ page = 1, limit = 20, order = [['createdAt', 'DESC']] } = {}) {
  const offset = (page - 1) * limit;
  const { count, rows } = await Image.findAndCountAll({
    include: [{ model: Tag, through: { attributes: [] } }],
    order,
    limit,
    offset
  });

  return {
    images: rows,
    total: count,
    page,
    totalPages: Math.ceil(count / limit)
  };
}

module.exports = {
  deleteImage,
  getImageWithTags,
  getImages
};