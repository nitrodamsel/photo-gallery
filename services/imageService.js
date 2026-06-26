const path = require('path');
const fs = require('fs');
const { Image, Tag, ImageTag } = require('../models');
const { Op } = require('sequelize');
const thumbnailService = require('./thumbnailService');

/**
 * Get paginated list of images, optionally filtered by tag slug
 */
async function getImages({ page = 1, limit = 12, tag = null } = {}) {
  const offset = (page - 1) * limit;

  const queryOptions = {
    include: [
      {
        model: Tag,
        as: 'tags',
        through: { attributes: [] },
        required: tag ? true : false,
        where: tag ? { slug: tag } : undefined,
      },
    ],
    order: [['created_at', 'DESC']],
    limit,
    offset,
    distinct: true,
  };

  const { count, rows } = await Image.findAndCountAll(queryOptions);

  // Attach thumbnail URLs
  const images = rows.map((img) => {
    const plain = img.toJSON();
    plain.thumbnailUrl = getThumbnailUrl(plain, 400);
    return plain;
  });

  return { images, total: count };
}

/**
 * Get a single image by ID with all tags
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

  if (!image) return null;

  const plain = image.toJSON();
  plain.thumbnailUrl = getThumbnailUrl(plain, 1200);
  plain.thumbnailSmallUrl = getThumbnailUrl(plain, 400);

  return plain;
}

/**
 * Get adjacent image (prev/next) by id based on upload order
 */
async function getAdjacentImage(id, direction) {
  const current = await Image.findByPk(id);
  if (!current) return null;

  const op = direction === 'prev' ? Op.gt : Op.lt;
  const order = direction === 'prev' ? 'ASC' : 'DESC';

  const adjacent = await Image.findOne({
    where: {
      id: { [op]: id },
    },
    order: [['id', order]],
  });

  if (!adjacent) return null;

  const plain = adjacent.toJSON();
  plain.thumbnailUrl = getThumbnailUrl(plain, 400);
  return plain;
}

/**
 * Build a thumbnail URL for a given image and size
 */
function getThumbnailUrl(image, size) {
  if (!image.filename) return '/images/placeholder.png';
  const ext = path.extname(image.filename);
  const base = path.basename(image.filename, ext);
  const thumbFilename = `${base}_${size}${ext}`;
  const thumbPath = path.join(__dirname, '..', 'uploads', 'thumbnails', thumbFilename);

  if (fs.existsSync(thumbPath)) {
    return `/uploads/thumbnails/${thumbFilename}`;
  }

  // Fall back to original
  return `/uploads/${image.filename}`;
}

module.exports = {
  getImages,
  getImageById,
  getAdjacentImage,
  getThumbnailUrl,
};