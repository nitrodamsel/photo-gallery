const path = require('path');
const fs = require('fs');
const Image = require('../models/Image');
const ImageTag = require('../models/ImageTag');
const ThumbnailCache = require('../models/ThumbnailCache');

const uploadsDir = path.join(__dirname, '..', 'uploads');
const thumbnailsDir = path.join(uploadsDir, 'thumbnails');

/**
 * Delete an image and all associated files and DB records.
 * @param {number} imageId
 */
async function deleteImage(imageId) {
  const image = await Image.findByPk(imageId);
  if (!image) {
    throw new Error(`Image with id ${imageId} not found`);
  }

  // Delete associated tags
  await ImageTag.destroy({ where: { imageId: image.id } });

  // Delete thumbnail cache records
  await ThumbnailCache.destroy({ where: { imageId: image.id } });

  // Delete original file
  const originalPath = path.join(uploadsDir, image.filename);
  if (fs.existsSync(originalPath)) {
    fs.unlinkSync(originalPath);
  }

  // Delete thumbnail files
  const thumbSizes = ['small', 'medium', 'large'];
  for (const size of thumbSizes) {
    const ext = path.extname(image.filename);
    const base = path.basename(image.filename, ext);
    const thumbPath = path.join(thumbnailsDir, `${base}_${size}.webp`);
    if (fs.existsSync(thumbPath)) {
      fs.unlinkSync(thumbPath);
    }
  }

  // Delete DB record
  await image.destroy();
}

module.exports = { deleteImage };