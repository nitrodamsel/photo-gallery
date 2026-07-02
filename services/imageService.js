const path = require('path');
const fs = require('fs');
const Image = require('../models/Image');
const ImageTag = require('../models/ImageTag');
const ThumbnailCache = require('../models/ThumbnailCache');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

/**
 * Delete an image and all associated files and DB records
 */
async function deleteImage(imageId) {
  const image = await Image.findByPk(imageId);
  if (!image) throw new Error(`Image with id ${imageId} not found`);

  // Delete thumbnails from disk
  const thumbnailCaches = await ThumbnailCache.findAll({ where: { imageId } });
  for (const cache of thumbnailCaches) {
    if (fs.existsSync(cache.thumbnailPath)) {
      try {
        fs.unlinkSync(cache.thumbnailPath);
      } catch (e) {
        console.warn(`Could not delete thumbnail file: ${cache.thumbnailPath}`, e);
      }
    }
    await cache.destroy();
  }

  // Delete original file
  const filePath = path.join(UPLOADS_DIR, image.filename);
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch (e) {
      console.warn(`Could not delete original file: ${filePath}`, e);
    }
  }

  // Delete image tags
  await ImageTag.destroy({ where: { imageId } });

  // Delete image record
  await image.destroy();

  return true;
}

/**
 * Get image with all associated tags
 */
async function getImageWithTags(imageId) {
  const Tag = require('../models/Tag');
  const image = await Image.findByPk(imageId, {
    include: [{ model: Tag, through: ImageTag }]
  });
  return image;
}

/**
 * Update image metadata
 */
async function updateImage(imageId, updates) {
  const image = await Image.findByPk(imageId);
  if (!image) throw new Error(`Image with id ${imageId} not found`);

  await image.update(updates);
  return image.reload();
}

module.exports = {
  deleteImage,
  getImageWithTags,
  updateImage
};