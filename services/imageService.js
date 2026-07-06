const path = require('path');
const fs = require('fs');
const { Image, Tag, ImageTag, sequelize } = require('../models');
const { Op } = require('sequelize');
const cacheService = require('./cacheService');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

/**
 * Get a paginated list of images with optional filters.
 * Results are cached using an LRU cache.
 */
async function getImages(options = {}) {
  const cacheKey = `getImages:${cacheService.hashQuery(options)}`;
  const cached = cacheService.get(cacheKey);
  if (cached) {
    return cached;
  }

  const {
    page = 1,
    limit = 24,
    sortBy = 'created_at',
    sortOrder = 'DESC',
    tagIds = [],
    search = '',
    startDate = null,
    endDate = null,
  } = options;

  const offset = (page - 1) * limit;

  const where = {};
  const include = [
    {
      model: Tag,
      as: 'tags',
      through: { attributes: [] },
      required: false,
    },
  ];

  if (search) {
    where[Op.or] = [
      { title: { [Op.iLike]: `%${search}%` } },
      { description: { [Op.iLike]: `%${search}%` } },
      { original_filename: { [Op.iLike]: `%${search}%` } },
    ];
  }

  if (startDate || endDate) {
    where.created_at = {};
    if (startDate) where.created_at[Op.gte] = new Date(startDate);
    if (endDate) where.created_at[Op.lte] = new Date(endDate);
  }

  let havingTagFilter = false;
  if (tagIds && tagIds.length > 0) {
    havingTagFilter = true;
  }

  let query;

  if (havingTagFilter) {
    // Use subquery to filter by tags
    const taggedImageIds = await ImageTag.findAll({
      attributes: ['image_id'],
      where: { tag_id: { [Op.in]: tagIds } },
      group: ['image_id'],
      having: sequelize.literal(`COUNT(DISTINCT tag_id) = ${tagIds.length}`),
      raw: true,
    });

    const ids = taggedImageIds.map((r) => r.image_id);
    if (ids.length === 0) {
      const emptyResult = { images: [], total: 0, page, limit, totalPages: 0 };
      cacheService.set(cacheKey, emptyResult);
      return emptyResult;
    }
    where.id = { [Op.in]: ids };
  }

  const validSortColumns = ['created_at', 'updated_at', 'title', 'file_size', 'original_filename'];
  const safeSortBy = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
  const safeSortOrder = ['ASC', 'DESC'].includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';

  const { count, rows } = await Image.findAndCountAll({
    where,
    include,
    order: [[safeSortBy, safeSortOrder]],
    limit: parseInt(limit, 10),
    offset: parseInt(offset, 10),
    distinct: true,
  });

  const result = {
    images: rows,
    total: count,
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
    totalPages: Math.ceil(count / limit),
  };

  cacheService.set(cacheKey, result);
  return result;
}

/**
 * Get a single image by ID, with tags.
 */
async function getImageById(id) {
  const cacheKey = `getImageById:${id}`;
  const cached = cacheService.get(cacheKey);
  if (cached) return cached;

  const image = await Image.findOne({
    where: { id },
    include: [
      {
        model: Tag,
        as: 'tags',
        through: { attributes: [] },
      },
    ],
  });

  if (image) {
    cacheService.set(cacheKey, image);
  }

  return image;
}

/**
 * Create a new image record.
 * Invalidates getImages cache entries (flush all since keys are hashed).
 */
async function createImage(data) {
  const image = await Image.create(data);
  // Flush cache since a new image was added
  cacheService.flush();
  return image;
}

/**
 * Update an image record by ID.
 * Invalidates specific image cache and general list cache.
 */
async function updateImage(id, data) {
  const [updatedCount, updatedRows] = await Image.update(data, {
    where: { id },
    returning: true,
  });

  if (updatedCount > 0) {
    cacheService.del(`getImageById:${id}`);
    // Flush list caches since content changed
    cacheService.flush();
  }

  return updatedRows ? updatedRows[0] : null;
}

/**
 * Delete an image by ID. Also removes the file from disk.
 */
async function deleteImage(id) {
  const image = await Image.findByPk(id);
  if (!image) return false;

  // Remove file from disk
  try {
    const filename = image.filename || image.file_path;
    if (filename) {
      const filePath = path.isAbsolute(filename)
        ? filename
        : path.join(UPLOADS_DIR, path.basename(filename));
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
  } catch (err) {
    console.warn(`[ImageService] Could not delete file for image ${id}:`, err.message);
  }

  // Remove thumbnail cache files
  try {
    const thumbnailsDir = path.join(UPLOADS_DIR, 'thumbnails');
    const sizes = ['small', 'medium', 'large', 'thumb'];
    sizes.forEach((size) => {
      const thumbPath = path.join(thumbnailsDir, `${id}_${size}.webp`);
      if (fs.existsSync(thumbPath)) {
        fs.unlinkSync(thumbPath);
      }
    });
  } catch (err) {
    console.warn(`[ImageService] Could not delete thumbnails for image ${id}:`, err.message);
  }

  await image.destroy();

  cacheService.del(`getImageById:${id}`);
  cacheService.flush();

  return true;
}

/**
 * Get images by tag ID.
 */
async function getImagesByTag(tagId, options = {}) {
  const cacheKey = `getImagesByTag:${cacheService.hashQuery({ tagId, ...options })}`;
  const cached = cacheService.get(cacheKey);
  if (cached) return cached;

  const { page = 1, limit = 24 } = options;
  const offset = (page - 1) * limit;

  const { count, rows } = await Image.findAndCountAll({
    include: [
      {
        model: Tag,
        as: 'tags',
        through: { attributes: [] },
        where: { id: tagId },
        required: true,
      },
    ],
    order: [['created_at', 'DESC']],
    limit: parseInt(limit, 10),
    offset: parseInt(offset, 10),
    distinct: true,
  });

  const result = {
    images: rows,
    total: count,
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
    totalPages: Math.ceil(count / limit),
  };

  cacheService.set(cacheKey, result);
  return result;
}

/**
 * Serve an original image file for download/inline viewing.
 */
async function getImageFilePath(id) {
  const image = await Image.findByPk(id);
  if (!image) return null;

  const filename = image.filename || image.file_path;
  if (!filename) return null;

  const filePath = path.isAbsolute(filename)
    ? filename
    : path.join(UPLOADS_DIR, path.basename(filename));

  if (!fs.existsSync(filePath)) return null;

  return { filePath, image };
}

module.exports = {
  getImages,
  getImageById,
  createImage,
  updateImage,
  deleteImage,
  getImagesByTag,
  getImageFilePath,
};