const { Op, fn, col, literal } = require('sequelize');
const { Image, Tag, ImageTag, sequelize } = require('../models');
const cacheService = require('./cacheService');

/**
 * Full-text search across images (title, description, originalName, tags).
 * Results are cached with a 5-minute TTL.
 */
async function search(query, options = {}) {
  const {
    page = 1,
    limit = 20,
    sortBy = 'createdAt',
    sortOrder = 'DESC',
    tagIds = [],
  } = options;

  const cacheKey = cacheService.hashQuery({
    fn: 'search',
    query,
    ...options,
  });

  const cached = cacheService.get(cacheKey);
  if (cached) {
    return cached;
  }

  const offset = (page - 1) * limit;
  const where = {};

  if (query && query.trim()) {
    const term = query.trim();
    where[Op.or] = [
      { title: { [Op.like]: `%${term}%` } },
      { description: { [Op.like]: `%${term}%` } },
      { originalName: { [Op.like]: `%${term}%` } },
    ];
  }

  const includeOptions = [
    {
      model: Tag,
      as: 'tags',
      through: { attributes: [] },
      required: tagIds.length > 0,
      ...(tagIds.length > 0 ? { where: { id: { [Op.in]: tagIds } } } : {}),
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
    query,
  };

  cacheService.set(cacheKey, result);
  return result;
}

/**
 * Search for tags matching a query string.
 */
async function searchTags(query, limit = 20) {
  const cacheKey = cacheService.hashQuery({ fn: 'searchTags', query, limit });
  const cached = cacheService.get(cacheKey);
  if (cached) {
    return cached;
  }

  const tags = await Tag.findAll({
    where: {
      name: { [Op.like]: `%${query}%` },
    },
    order: [['name', 'ASC']],
    limit: parseInt(limit),
  });

  cacheService.set(cacheKey, tags);
  return tags;
}

/**
 * Get related images by shared tags.
 */
async function getRelatedImages(imageId, limit = 6) {
  const cacheKey = cacheService.hashQuery({ fn: 'getRelatedImages', imageId, limit });
  const cached = cacheService.get(cacheKey);
  if (cached) {
    return cached;
  }

  // Get tag IDs for this image
  const imageTags = await ImageTag.findAll({
    where: { imageId },
    attributes: ['tagId'],
  });

  if (imageTags.length === 0) {
    return [];
  }

  const tagIds = imageTags.map((it) => it.tagId);

  // Find images that share at least one tag, excluding the current image
  const related = await Image.findAll({
    include: [
      {
        model: Tag,
        as: 'tags',
        through: { attributes: [] },
        where: { id: { [Op.in]: tagIds } },
        required: true,
      },
    ],
    where: {
      id: { [Op.ne]: imageId },
    },
    limit: parseInt(limit),
    order: literal('RANDOM()'),
  });

  cacheService.set(cacheKey, related);
  return related;
}

module.exports = { search, searchTags, getRelatedImages };