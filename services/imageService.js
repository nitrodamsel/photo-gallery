const path = require('path');
const fs = require('fs').promises;
const { Image, Tag, ImageTag, ThumbnailCache } = require('../models');
const thumbnailService = require('./thumbnailService');
const exifService = require('./exifService');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

/**
 * Get all images with optional filtering
 */
async function getAllImages(options = {}) {
  const { limit = 20, offset = 0, tagId, search } = options;

  const query = {
    limit,
    offset,
    include: [{ model: Tag, through: { attributes: [] } }],
    order: [['createdAt', 'DESC']]
  };

  const images = await Image.findAndCountAll(query);
  return images;
}

/**
 * Get a single image by ID with tags
 */
async function getImageById(id) {
  const image = await Image.findByPk(id, {
    include: [{ model: Tag, through: { attributes: [] } }]
  });
  return image;
}

/**
 * Delete an image and all associated files and records
 */
async function deleteImage(imageId) {
  const image = await Image.findByPk(imageId);
  if (!image) {
    throw new Error(`Image ${imageId} not found`);
  }

  // Delete main file
  try {
    const mainFilePath = path.join(UPLOADS_DIR, image.filename);
    await fs.unlink(mainFilePath);
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.error(`Failed to delete main file for image ${imageId}:`, err);
    }
  }

  // Delete thumbnail files from ThumbnailCache
  try {
    const thumbnails = await ThumbnailCache.findAll({ where: { imageId } });
    for (const thumb of thumbnails) {
      try {
        const thumbPath = path.join(UPLOADS_DIR, thumb.filename);
        await fs.unlink(thumbPath);
      } catch (err) {
        if (err.code !== 'ENOENT') {
          console.error(`Failed to delete thumbnail file ${thumb.filename}:`, err);
        }
      }
    }
  } catch (err) {
    console.error(`Failed to clean up thumbnails for image ${imageId}:`, err);
  }

  // Delete thumbnail cache records
  await ThumbnailCache.destroy({ where: { imageId } });

  // Delete image-tag associations
  await ImageTag.destroy({ where: { imageId } });

  // Delete the image record
  await image.destroy();
}

/**
 * Save an uploaded image with EXIF extraction
 */
async function saveImage(fileData) {
  const { filename, originalName, mimetype, size, path: filePath } = fileData;

  let exifData = {};
  try {
    exifData = await exifService.extractExif(filePath);
  } catch (err) {
    console.error('EXIF extraction failed:', err);
  }

  const image = await Image.create({
    filename,
    originalName,
    mimetype,
    size,
    exifData: JSON.stringify(exifData),
    rotation: 0
  });

  return image;
}

module.exports = {
  getAllImages,
  getImageById,
  deleteImage,
  saveImage
};