const path = require('path');
const fs = require('fs');
const Image = require('../models/Image');
const ImageTag = require('../models/ImageTag');
const ThumbnailCache = require('../models/ThumbnailCache');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');

/**
 * Delete an image and all associated files and DB records
 * @param {number} imageId
 */
async function deleteImage(imageId) {
  const image = await Image.findByPk(imageId);
  if (!image) {
    throw new Error(`Image with id ${imageId} not found`);
  }

  // Delete associated DB records first
  await ImageTag.destroy({ where: { imageId } });
  await ThumbnailCache.destroy({ where: { imageId } });

  // Delete thumbnail files
  const thumbDir = path.join(UPLOAD_DIR, 'thumbnails');
  const thumbSizes = ['small', 'medium', 'large'];
  for (const size of thumbSizes) {
    const thumbPath = path.join(thumbDir, size, image.filename);
    if (fs.existsSync(thumbPath)) {
      try {
        fs.unlinkSync(thumbPath);
      } catch (err) {
        console.error(`Failed to delete thumbnail ${thumbPath}:`, err);
      }
    }
  }

  // Delete original file
  const originalPath = path.join(UPLOAD_DIR, image.filename);
  if (fs.existsSync(originalPath)) {
    try {
      fs.unlinkSync(originalPath);
    } catch (err) {
      console.error(`Failed to delete original file ${originalPath}:`, err);
    }
  }

  // Delete DB record
  await image.destroy();
}

/**
 * Get image by ID
 * @param {number} imageId
 */
async function getImageById(imageId) {
  return Image.findByPk(imageId);
}

module.exports = { deleteImage, getImageById };