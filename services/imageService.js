const path = require('path');
const fs = require('fs');
const { Image, Tag, ImageTag, ThumbnailCache } = require('../models');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

/**
 * Delete an image and all associated files and DB records
 * @param {number} imageId
 */
async function deleteImage(imageId) {
  const image = await Image.findByPk(imageId);
  if (!image) {
    throw new Error(`Image ${imageId} not found`);
  }

  // Delete original file
  const originalPath = path.join(UPLOADS_DIR, image.filename);
  if (fs.existsSync(originalPath)) {
    fs.unlinkSync(originalPath);
  }

  // Delete thumbnail files
  const thumbDir = path.join(UPLOADS_DIR, 'thumbnails');
  if (fs.existsSync(thumbDir)) {
    const basename = path.parse(image.filename).name;
    const files = fs.readdirSync(thumbDir);
    for (const file of files) {
      if (file.startsWith(basename)) {
        fs.unlinkSync(path.join(thumbDir, file));
      }
    }
  }

  // Delete DB associations
  await ImageTag.destroy({ where: { imageId } });
  await ThumbnailCache.destroy({ where: { imageId } });

  // Delete the image record
  await image.destroy();
}

/**
 * Get image by ID with tags
 * @param {number} imageId
 */
async function getImageWithTags(imageId) {
  return Image.findByPk(imageId, {
    include: [{ model: Tag, through: { attributes: [] } }]
  });
}

module.exports = { deleteImage, getImageWithTags };