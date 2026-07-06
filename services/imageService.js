const path = require('path');
const fs = require('fs');
const { Image, Tag, ImageTag, sequelize } = require('../models');
const { Op } = require('sequelize');
const cacheService = require('./cacheService');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');

/**
 * Get paginated images with optional filtering.
 * Results are cached using LRU cache.
 */
async function getImages({
  page = 1,
  limit = 20,
  sort = 'createdAt',
  order = 'DESC',
  tag = null,
  search = null,
} = {}) {
  // Build cache key from query parameters
  const cacheKey = cacheService.hashQuery({ page, limit, sort, order, tag, search });
  const cached = cacheService.get(cacheKey);
  if (cached) {
    return cached;
  }

  const offset = (page - 1) * limit;

  const whereClause = {};
  if (search) {
    whereClause[Op.or] = [
      { title: { [Op.like]: `%${search}%` } },
      { description: { [Op.like]: `%${search}%` } },
      { original_filename: { [Op.like]: `%${search}%` } },
    ];
  }

  const includeOptions = [
    {
      model: Tag,
      as: 'tags',
      through: { attributes: [] },
      required: !!tag,
      ...(tag && { where: { name: tag } }),
    },
  ];

  const validSortFields = ['createdAt', 'updatedAt', 'title', 'file_size', 'taken_at'];
  const sortField = validSortFields.includes(sort) ? sort : 'createdAt';
  const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  const { count, rows } = await Image.findAndCountAll({
    where: whereClause,
    include: includeOptions,
    order: [[sortField, sortOrder]],
    limit: parseInt(limit),
    offset: parseInt(offset),
    distinct: true,
  });

  const result = {
    images: rows,
    total: count,
    page: parseInt(page),
    limit: parseInt(limit),
    totalPages: Math.ceil(count / limit),
  };

  // Cache the result
  cacheService.set(cacheKey, result);

  return result;
}

/**
 * Get a single image by ID with tags.
 */
async function getImageById(id) {
  const cacheKey = `image:${id}`;
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
 */
async function createImage(data) {
  const image = await Image.create(data);
  // Invalidate list cache
  cacheService.flush();
  return image;
}

/**
 * Update an image record.
 */
async function updateImage(id, data) {
  const image = await Image.findByPk(id);
  if (!image) {
    throw new Error('Image not found');
  }

  await image.update(data);

  // Invalidate cache for this image and lists
  cacheService.del(`image:${id}`);
  cacheService.flush();

  return image;
}

/**
 * Delete an image record and its file.
 */
async function deleteImage(id) {
  const image = await Image.findByPk(id);
  if (!image) {
    throw new Error('Image not found');
  }

  // Delete file from disk
  if (image.filename) {
    const filePath = path.join(UPLOAD_DIR, path.basename(image.filename));
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  await image.destroy();

  // Invalidate cache
  cacheService.del(`image:${id}`);
  cacheService.flush();

  return true;
}

/**
 * Get recent images.
 */
async function getRecentImages(limit = 12) {
  const cacheKey = `recent:${limit}`;
  const cached = cacheService.get(cacheKey);
  if (cached) return cached;

  const images = await Image.findAll({
    include: [{ model: Tag, as: 'tags', through: { attributes: [] } }],
    order: [['createdAt', 'DESC']],
    limit: parseInt(limit),
  });

  cacheService.set(cacheKey, images, { ttl: 2 * 60 * 1000 }); // 2 min TTL for recent
  return images;
}

/**
 * Get image stats (total count, total size).
 */
async function getImageStats() {
  const cacheKey = 'image:stats';
  const cached = cacheService.get(cacheKey);
  if (cached) return cached;

  const stats = await Image.findOne({
    attributes: [
      [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      [sequelize.fn('SUM', sequelize.col('file_size')), 'totalSize'],
    ],
    raw: true,
  });

  const result = {
    count: parseInt(stats.count) || 0,
    totalSize: parseInt(stats.totalSize) || 0,
  };

  cacheService.set(cacheKey, result, { ttl: 60 * 1000 }); // 1 min TTL
  return result;
}

/**
 * Serve original image file with proper headers.
 * @param {string} id - Image ID
 * @param {Object} res - Express response
 */
async function serveOriginal(id, res) {
  const image = await Image.findByPk(id);
  if (!image) {
    return res.status(404).json({ error: 'Image not found' });
  }

  const filename = image.filename || image.file_path;
  if (!filename) {
    return res.status(404).json({ error: 'Image file not found' });
  }

  const filePath = path.join(UPLOAD_DIR, path.basename(filename));
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Image file not found on disk' });
  }

  const stats = fs.statSync(filePath);
  const mimeType = image.mime_type || getMimeType(filename);

  res.setHeader('Content-Type', mimeType);
  res.setHeader('Content-Disposition', `inline; filename="${image.original_filename || path.basename(filename)}"`);
  res.setHeader('Content-Length', stats.size);
  res.setHeader('Last-Modified', stats.mtime.toUTCString());
  res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 day for originals

  const readStream = fs.createReadStream(filePath);
  readStream.pipe(res);
}

/**
 * Get MIME type from file extension.
 */
function getMimeType(filename) {
  const ext = path.extname(filename).toLowerCase();
  const mimeTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.avif': 'image/avif',
    '.tiff': 'image/tiff',
    '.tif': 'image/tiff',
    '.bmp': 'image/bmp',
    '.svg': 'image/svg+xml',
    '.heic': 'image/heic',
    '.heif': 'image/heif',
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

module.exports = {
  getImages,
  getImageById,
  createImage,
  updateImage,
  deleteImage,
  getRecentImages,
  getImageStats,
  serveOriginal,
  getMimeType,
};