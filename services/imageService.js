const path = require('path');
const fs = require('fs');
const { Image, Tag, ImageTag } = require('../models');
const { Op } = require('sequelize');
const thumbnailService = require('./thumbnailService');
const exifService = require('./exifService');

/**
 * Get paginated images with optional tag filter
 */
async function getImages({ page = 1, limit = 12, tag = null } = {}) {
  const offset = (page - 1) * limit;

  const queryOptions = {
    include: [
      {
        model: Tag,
        as: 'tags',
        through: { attributes: [] },
      },
    ],
    order: [['created_at', 'DESC']],
    limit,
    offset,
    distinct: true,
  };

  if (tag) {
    queryOptions.include[0].where = { slug: tag };
    queryOptions.include[0].required = true;
  }

  const { count, rows } = await Image.findAndCountAll(queryOptions);

  return {
    images: rows,
    total: count,
  };
}

/**
 * Get a single image by ID with all associations
 */
async function getImageById(id) {
  const image = await Image.findByPk(id, {
    include: [
      {
        model: Tag,
        as: 'tags',
        through: { attributes: [] },
      },
    ],
  });

  return image;
}

/**
 * Get previous image (uploaded before this one)
 */
async function getPrevImage(id) {
  const image = await Image.findOne({
    where: { id: { [Op.lt]: id } },
    order: [['id', 'DESC']],
    attributes: ['id', 'original_filename'],
  });
  return image;
}

/**
 * Get next image (uploaded after this one)
 */
async function getNextImage(id) {
  const image = await Image.findOne({
    where: { id: { [Op.gt]: id } },
    order: [['id', 'ASC']],
    attributes: ['id', 'original_filename'],
  });
  return image;
}

/**
 * Upload a new image
 */
async function uploadImage(file, metadata = {}) {
  const { exifData, gpsData } = await exifService.extractExif(file.path);

  const imageData = {
    original_filename: file.originalname,
    stored_filename: file.filename,
    file_path: file.path,
    file_size: file.size,
    mime_type: file.mimetype,
    width: metadata.width || null,
    height: metadata.height || null,
    exif_data: exifData || null,
    gps_latitude: gpsData?.latitude || null,
    gps_longitude: gpsData?.longitude || null,
    camera_make: exifData?.Make || null,
    camera_model: exifData?.Model || null,
    lens_model: exifData?.LensModel || null,
    date_taken: exifData?.DateTimeOriginal || null,
    iso: exifData?.ISO || null,
    aperture: exifData?.FNumber || null,
    shutter_speed: exifData?.ExposureTime || null,
    focal_length: exifData?.FocalLength || null,
  };

  const image = await Image.create(imageData);

  // Generate thumbnails
  try {
    await thumbnailService.generateThumbnails(file.path, image.id);
  } catch (err) {
    console.error('Thumbnail generation failed:', err);
  }

  return image;
}

/**
 * Delete an image and its files
 */
async function deleteImage(id) {
  const image = await Image.findByPk(id);
  if (!image) return false;

  // Delete files
  try {
    if (fs.existsSync(image.file_path)) {
      fs.unlinkSync(image.file_path);
    }
  } catch (err) {
    console.error('Failed to delete image file:', err);
  }

  await image.destroy();
  return true;
}

/**
 * Get thumbnail URL for an image
 */
function getThumbnailUrl(image, size = 400) {
  if (!image) return '/images/placeholder.jpg';
  // Try to build thumbnail path
  const filename = image.stored_filename;
  if (!filename) return '/images/placeholder.jpg';
  const ext = path.extname(filename);
  const base = path.basename(filename, ext);
  return `/thumbnails/${base}_${size}${ext}`;
}

module.exports = {
  getImages,
  getImageById,
  getPrevImage,
  getNextImage,
  uploadImage,
  deleteImage,
  getThumbnailUrl,
};