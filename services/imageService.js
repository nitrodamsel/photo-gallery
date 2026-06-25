const path = require('path');
const { Image, Tag, ImageTag } = require('../models');
const { Op } = require('sequelize');
const { extractExif } = require('./exifService');
const { generateThumbnails, deleteThumbnails } = require('./thumbnailService');
const { safeDelete, getPublicUrl } = require('../utils/fileHelpers');

/**
 * Creates a new image record with EXIF extraction and thumbnail generation.
 * @param {Express.Multer.File} file - Multer file object.
 * @param {Object} options - Additional options (tags, title, description, etc.)
 * @returns {Promise<Image>} The created Image model instance.
 */
async function createImage(file, options = {}) {
  const filePath = file.path;
  const originalFilename = file.originalname;
  const mimeType = file.verifiedMimeType || file.mimetype;
  const fileSize = file.size;
  const publicUrl = getPublicUrl(filePath);

  // Extract EXIF data (non-blocking failure)
  let exifData = {};
  try {
    exifData = await extractExif(filePath);
  } catch (err) {
    console.warn('[imageService] EXIF extraction failed, continuing without EXIF:', err.message);
  }

  // Build image record data
  const imageData = {
    filename: path.basename(filePath),
    originalFilename,
    filePath,
    publicUrl,
    mimeType,
    fileSize,
    title: options.title || path.basename(originalFilename, path.extname(originalFilename)),
    description: options.description || null,
    exifData: Object.keys(exifData).length > 0 ? exifData : null,
    cameraMake: exifData.cameraMake || null,
    cameraModel: exifData.cameraModel || null,
    lens: exifData.lens || null,
    focalLength: exifData.focalLength || null,
    aperture: exifData.aperture || null,
    shutterSpeed: exifData.shutterSpeed || null,
    iso: exifData.iso || null,
    dateTaken: exifData.dateTaken || null,
    gpsLat: exifData.gps ? exifData.gps.lat : null,
    gpsLng: exifData.gps ? exifData.gps.lng : null,
    colorSpace: exifData.colorSpace || null,
    orientation: exifData.orientation || null,
    width: exifData.imageWidth || null,
    height: exifData.imageHeight || null,
  };

  // Create DB record first so we have an ID for thumbnails
  const image = await Image.create(imageData);

  // Generate thumbnails (partial failure is acceptable)
  try {
    const thumbPaths = await generateThumbnails(filePath, image.id);

    const updates = {};
    if (thumbPaths.thumb400) {
      updates.thumbnailSmall = getPublicUrl(thumbPaths.thumb400);
    }
    if (thumbPaths.thumb1200) {
      updates.thumbnailLarge = getPublicUrl(thumbPaths.thumb1200);
    }

    if (Object.keys(updates).length > 0) {
      await image.update(updates);
    }
  } catch (err) {
    console.error(
      '[imageService] Thumbnail generation failed, image saved without thumbnails:',
      err.message
    );
  }

  // Handle tags if provided
  if (options.tags && Array.isArray(options.tags) && options.tags.length > 0) {
    try {
      await attachTags(image, options.tags);
    } catch (err) {
      console.warn('[imageService] Failed to attach tags:', err.message);
    }
  }

  // Reload with associations
  const fullImage = await Image.findByPk(image.id, {
    include: [{ model: Tag, as: 'tags', through: { attributes: [] } }],
  });

  return fullImage;
}

/**
 * Retrieves images with optional filtering and pagination.
 * @param {Object} filters - { page, limit, tagIds, search }
 * @returns {Promise<{ rows: Image[], count: number }>}
 */
async function getImages(filters = {}) {
  const { page = 1, limit = 20, tagIds, search } = filters;
  const offset = (page - 1) * limit;

  const where = {};
  const include = [{ model: Tag, as: 'tags', through: { attributes: [] } }];

  if (search) {
    where[Op.or] = [
      { title: { [Op.like]: `%${search}%` } },
      { description: { [Op.like]: `%${search}%` } },
      { originalFilename: { [Op.like]: `%${search}%` } },
    ];
  }

  const queryOptions = {
    where,
    include,
    limit: parseInt(limit, 10),
    offset: parseInt(offset, 10),
    order: [['createdAt', 'DESC']],
    distinct: true,
  };

  if (tagIds && tagIds.length > 0) {
    queryOptions.include = [
      {
        model: Tag,
        as: 'tags',
        through: { attributes: [] },
        where: { id: { [Op.in]: tagIds } },
        required: true,
      },
    ];
  }

  return Image.findAndCountAll(queryOptions);
}

/**
 * Retrieves a single image by ID with all associations.
 * @param {number} id
 * @returns {Promise<Image|null>}
 */
async function getImageById(id) {
  return Image.findByPk(id, {
    include: [{ model: Tag, as: 'tags', through: { attributes: [] } }],
  });
}

/**
 * Deletes an image and all associated files.
 * @param {number} id
 * @returns {Promise<boolean>} true if deleted, false if not found.
 */
async function deleteImage(id) {
  const image = await Image.findByPk(id);
  if (!image) return false;

  // Delete files
  await safeDelete(image.filePath);
  await deleteThumbnails(id);

  // Delete DB record (cascades to ImageTag)
  await image.destroy();

  return true;
}

/**
 * Attaches tags to an image, creating new tags if needed.
 * @param {Image} image
 * @param {string[]} tagNames
 */
async function attachTags(image, tagNames) {
  const tagInstances = await Promise.all(
    tagNames.map((name) =>
      Tag.findOrCreate({
        where: { name: name.toLowerCase().trim() },
        defaults: { name: name.toLowerCase().trim() },
      }).then(([tag]) => tag)
    )
  );

  await image.setTags(tagInstances);
}

module.exports = {
  createImage,
  getImages,
  getImageById,
  deleteImage,
};