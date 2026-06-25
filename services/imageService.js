const path = require('path');
const { Image, Tag, ImageTag } = require('../models');
const { Op } = require('sequelize');
const { extractExif } = require('./exifService');
const { generateThumbnails, deleteThumbnails } = require('./thumbnailService');
const { safeDelete, getPublicUrl } = require('../utils/fileHelpers');

/**
 * Creates a new Image record, extracting EXIF and generating thumbnails.
 * @param {Express.Multer.File} file - The uploaded file object from Multer.
 * @param {Object} options - Additional options (tags, title, description, etc.)
 * @returns {Promise<Image>} The created Image model instance.
 */
async function createImage(file, options = {}) {
  const filePath = file.path;
  const originalName = file.originalname;
  const mimeType = file.verifiedMimeType || file.mimetype;
  const fileSize = file.size;
  const filename = file.filename;

  // 1. Extract EXIF metadata
  let exifData = {};
  try {
    exifData = await extractExif(filePath);
  } catch (err) {
    console.warn(`[imageService] EXIF extraction failed: ${err.message}`);
  }

  // 2. Build the Image record (before thumbnails so we have an ID)
  const imageData = {
    filename,
    originalName,
    mimeType,
    fileSize,
    filePath,
    publicUrl: getPublicUrl(filePath),
    title: options.title || originalName,
    description: options.description || null,
    exifData: Object.keys(exifData).length > 0 ? exifData : null,
    dateTaken: exifData.dateTaken || null,
    cameraMake: exifData.cameraMake || null,
    cameraModel: exifData.cameraModel || null,
    gpsLat: exifData.gps ? exifData.gps.lat : null,
    gpsLng: exifData.gps ? exifData.gps.lng : null,
    width: exifData.imageWidth || null,
    height: exifData.imageHeight || null,
    status: 'active',
  };

  const image = await Image.create(imageData);

  // 3. Generate thumbnails (non-fatal failure)
  try {
    const thumbs = await generateThumbnails(filePath, image.id);
    await image.update({
      thumbnailUrl: getPublicUrl(thumbs.thumb400),
      largeUrl: getPublicUrl(thumbs.thumb1200),
    });
  } catch (thumbErr) {
    console.error(`[imageService] Thumbnail generation failed for image ${image.id}: ${thumbErr.message}`);
    // Continue — original is still saved
  }

  // 4. Associate tags if provided
  if (options.tagIds && Array.isArray(options.tagIds) && options.tagIds.length > 0) {
    try {
      const tags = await Tag.findAll({ where: { id: options.tagIds } });
      await image.setTags(tags);
    } catch (tagErr) {
      console.warn(`[imageService] Failed to associate tags: ${tagErr.message}`);
    }
  }

  // 5. Return full record with tags
  const fullImage = await Image.findByPk(image.id, {
    include: [{ model: Tag, through: { attributes: [] } }],
  });

  return fullImage;
}

/**
 * Retrieves a paginated list of images with optional tag filtering.
 * @param {Object} filters - { page, limit, tagIds, search }
 * @returns {Promise<{ images: Image[], total: number, page: number, limit: number }>}
 */
async function getImages(filters = {}) {
  const page = Math.max(1, parseInt(filters.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(filters.limit, 10) || 20));
  const offset = (page - 1) * limit;

  const where = { status: 'active' };

  if (filters.search) {
    where[Op.or] = [
      { title: { [Op.like]: `%${filters.search}%` } },
      { description: { [Op.like]: `%${filters.search}%` } },
      { originalName: { [Op.like]: `%${filters.search}%` } },
    ];
  }

  const queryOptions = {
    where,
    limit,
    offset,
    order: [['createdAt', 'DESC']],
    include: [{ model: Tag, through: { attributes: [] } }],
  };

  // Filter by tags using subquery
  if (filters.tagIds && filters.tagIds.length > 0) {
    const tagIdList = Array.isArray(filters.tagIds)
      ? filters.tagIds.map(Number)
      : [Number(filters.tagIds)];

    queryOptions.include = [
      {
        model: Tag,
        through: { attributes: [] },
        where: { id: tagIdList },
        required: true,
      },
    ];
  }

  const { count, rows } = await Image.findAndCountAll(queryOptions);

  return {
    images: rows,
    total: count,
    page,
    limit,
    totalPages: Math.ceil(count / limit),
  };
}

/**
 * Retrieves a single image by ID with eager-loaded tags.
 * @param {number} id
 * @returns {Promise<Image|null>}
 */
async function getImageById(id) {
  return Image.findByPk(id, {
    include: [{ model: Tag, through: { attributes: [] } }],
  });
}

/**
 * Deletes an image record and all associated files.
 * @param {number} id
 * @returns {Promise<boolean>} true if deleted, false if not found.
 */
async function deleteImage(id) {
  const image = await Image.findByPk(id);
  if (!image) return false;

  // Delete original file
  await safeDelete(image.filePath);

  // Delete thumbnails
  await deleteThumbnails(id);

  // Remove DB record (cascades to image_tags)
  await image.destroy();

  return true;
}

module.exports = { createImage, getImages, getImageById, deleteImage };