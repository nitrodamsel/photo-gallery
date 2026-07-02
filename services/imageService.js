const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const { Image, Tag, ImageTag, ThumbnailCache } = require('../models');
const exifService = require('./exifService');
const thumbnailService = require('./thumbnailService');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

/**
 * Delete an image and all associated files/DB records.
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
  const thumbsDir = path.join(UPLOADS_DIR, 'thumbnails');
  const baseName = path.parse(image.filename).name;
  const thumbnailSizes = ['small', 'medium', 'large'];

  for (const size of thumbnailSizes) {
    const thumbPath = path.join(thumbsDir, `${baseName}-${size}.jpg`);
    if (fs.existsSync(thumbPath)) {
      fs.unlinkSync(thumbPath);
    }
    const thumbPathWebp = path.join(thumbsDir, `${baseName}-${size}.webp`);
    if (fs.existsSync(thumbPathWebp)) {
      fs.unlinkSync(thumbPathWebp);
    }
  }

  // Delete thumbnail cache records
  await ThumbnailCache.destroy({ where: { imageId } });

  // Delete image-tag associations
  await ImageTag.destroy({ where: { imageId } });

  // Delete the image record
  await image.destroy();
}

/**
 * Process and save an uploaded image.
 * @param {object} file - multer file object
 * @param {object} options - additional options
 * @returns {Promise<Image>}
 */
async function processUpload(file, options = {}) {
  const filename = file.filename;
  const originalPath = path.join(UPLOADS_DIR, filename);

  // Extract EXIF data
  let exifData = {};
  let metadata = {};
  try {
    exifData = await exifService.extractExif(originalPath);
    const sharpMeta = await sharp(originalPath).metadata();
    metadata = {
      width: sharpMeta.width,
      height: sharpMeta.height,
      format: sharpMeta.format,
      size: file.size
    };
  } catch (err) {
    console.error('Error extracting metadata:', err);
  }

  // Generate thumbnails
  try {
    await thumbnailService.generateThumbnails(filename, 0);
  } catch (err) {
    console.error('Error generating thumbnails:', err);
  }

  // Create DB record
  const image = await Image.create({
    filename,
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    width: metadata.width,
    height: metadata.height,
    description: options.description || '',
    exifData,
    rotation: 0,
    manualExif: {}
  });

  return image;
}

module.exports = { deleteImage, processUpload };