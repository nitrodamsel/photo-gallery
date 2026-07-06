const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const { Image, Tag, ImageTag } = require('../models');
const { Op } = require('sequelize');
const cacheService = require('./cacheService');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');

/**
 * Get a paginated list of images with optional filtering.
 */
async function getImages(options = {}) {
  const {
    page = 1,
    limit = 20,
    sortBy = 'createdAt',
    sortOrder = 'DESC',
    tagId,
    search,
  } = options;

  const cacheKey = cacheService.hashQuery({ fn: 'getImages', ...options });
  const cached = cacheService.get(cacheKey);
  if (cached) {
    return cached;
  }

  const offset = (page - 1) * limit;
  const where = {};

  if (search) {
    where[Op.or] = [
      { title: { [Op.like]: `%${search}%` } },
      { description: { [Op.like]: `%${search}%` } },
      { originalName: { [Op.like]: `%${search}%` } },
    ];
  }

  const includeOptions = [
    {
      model: Tag,
      as: 'tags',
      through: { attributes: [] },
      required: !!tagId,
      ...(tagId ? { where: { id: tagId } } : {}),
    },
  ];

  const { count, rows } = await Image.findAndCountAll({
    where,
    include: includeOptions,
    order: [[sortBy, sortOrder]],
    limit: parseInt(limit),
    offset,
    distinct: true,
  });

  const result = {
    images: rows,
    total: count,
    page: parseInt(page),
    totalPages: Math.ceil(count / limit),
    limit: parseInt(limit),
  };

  cacheService.set(cacheKey, result);
  return result;
}

/**
 * Get a single image by ID with its tags.
 */
async function getImageById(id) {
  const cacheKey = cacheService.hashQuery({ fn: 'getImageById', id });
  const cached = cacheService.get(cacheKey);
  if (cached) {
    return cached;
  }

  const image = await Image.findByPk(id, {
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
 * Delete an image and its file from disk.
 */
async function deleteImage(id) {
  const image = await Image.findByPk(id);
  if (!image) {
    throw new Error('Image not found');
  }

  // Remove file from disk
  const filePath = path.join(UPLOAD_DIR, image.filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  // Remove any thumbnails
  const sizes = ['small', 'medium', 'large', 'thumb'];
  for (const size of sizes) {
    const thumbPath = path.join(UPLOAD_DIR, 'thumbnails', size, `${id}.webp`);
    if (fs.existsSync(thumbPath)) {
      fs.unlinkSync(thumbPath);
    }
  }

  await ImageTag.destroy({ where: { imageId: id } });
  await image.destroy();

  // Invalidate caches
  cacheService.del(cacheService.hashQuery({ fn: 'getImageById', id }));

  return true;
}

/**
 * Update image metadata.
 */
async function updateImage(id, updates) {
  const image = await Image.findByPk(id);
  if (!image) {
    throw new Error('Image not found');
  }

  await image.update(updates);

  // Invalidate cache for this image
  cacheService.del(cacheService.hashQuery({ fn: 'getImageById', id }));

  return image;
}

/**
 * Generate a thumbnail for an image at a given size.
 */
async function generateThumbnail(imageId, size = 'medium') {
  const SIZE_MAP = {
    small: { width: 200, height: 200 },
    medium: { width: 400, height: 400 },
    large: { width: 800, height: 800 },
    thumb: { width: 150, height: 150 },
  };

  const dimensions = SIZE_MAP[size];
  if (!dimensions) {
    throw new Error(`Invalid size: ${size}`);
  }

  const image = await Image.findByPk(imageId);
  if (!image) {
    throw new Error('Image not found');
  }

  const originalPath = path.join(UPLOAD_DIR, image.filename);
  if (!fs.existsSync(originalPath)) {
    throw new Error('Original image file not found');
  }

  const thumbnailDir = path.join(UPLOAD_DIR, 'thumbnails', size);
  if (!fs.existsSync(thumbnailDir)) {
    fs.mkdirSync(thumbnailDir, { recursive: true });
  }

  const thumbnailPath = path.join(thumbnailDir, `${imageId}.webp`);

  await sharp(originalPath)
    .resize(dimensions.width, dimensions.height, {
      fit: 'cover',
      position: 'center',
      withoutEnlargement: true,
    })
    .webp({ quality: 82, effort: 4 })
    .toFile(thumbnailPath);

  return thumbnailPath;
}

/**
 * Serve original image file with proper headers.
 */
async function serveOriginal(id, req, res) {
  const image = await Image.findByPk(id);
  if (!image) {
    return res.status(404).json({ error: 'Image not found' });
  }

  const filePath = path.join(UPLOAD_DIR, image.filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Image file not found on disk' });
  }

  // Determine MIME type
  const ext = path.extname(image.filename).toLowerCase();
  const mimeTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.avif': 'image/avif',
    '.heic': 'image/heic',
    '.tiff': 'image/tiff',
    '.bmp': 'image/bmp',
  };

  const mimeType = mimeTypes[ext] || 'application/octet-stream';
  res.setHeader('Content-Type', mimeType);
  res.setHeader('Content-Disposition', `inline; filename="${image.originalName || image.filename}"`);

  // Set caching headers for original
  const stat = fs.statSync(filePath);
  const etag = `"${stat.mtime.getTime().toString(16)}-${stat.size.toString(16)}"`;
  res.setHeader('ETag', etag);
  res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 day for originals

  const ifNoneMatch = req.headers['if-none-match'];
  if (ifNoneMatch && ifNoneMatch === etag) {
    return res.status(304).end();
  }

  const stream = fs.createReadStream(filePath);
  stream.on('error', (err) => {
    console.error('Error streaming original image:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to serve image' });
    }
  });
  stream.pipe(res);
}

module.exports = {
  getImages,
  getImageById,
  deleteImage,
  updateImage,
  generateThumbnail,
  serveOriginal,
};