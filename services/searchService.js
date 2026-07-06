const { Image, Tag, sequelize } = require('../models');
const { Op } = require('sequelize');
const cacheService = require('./cacheService');

/**
 * Search images by query string and/or tags.
 * Results are cached using LRU cache with 5 minute TTL.
 *
 * @param {Object} params - Search parameters
 * @param {string} [params.q] - Text search query
 * @param {string[]} [params.tags] - Array of tag names
 * @param {string} [params.sort] - Sort field
 * @param {string} [params.order] - Sort order (ASC/DESC)
 * @param {number} [params.page] - Page number
 * @param {number} [params.limit] - Results per page
 * @param {string} [params.dateFrom] - Filter from date
 * @param {string} [params.dateTo] - Filter to date
 * @returns {Object} { images, total, page, limit, totalPages, query }
 */
async function search({
  q = '',
  tags = [],
  sort = 'createdAt',
  order = 'DESC',
  page = 1,
  limit = 20,
  dateFrom = null,
  dateTo = null,
} = {}) {
  // Normalize tags to array
  const tagList = Array.isArray(tags)
    ? tags.filter(Boolean)
    : tags
    ? [tags]
    : [];

  // Build cache key from all parameters
  const cacheKey = cacheService.hashQuery({
    q: q.trim(),
    tags: tagList.slice().sort(),
    sort,
    order,
    page,
    limit,
    dateFrom,
    dateTo,
  });

  const cached = cacheService.get(cacheKey);
  if (cached) {
    return { ...cached, fromCache: true };
  }

  const offset = (page - 1) * limit;
  const whereClause = {};

  // Text search across title, description, original_filename
  if (q && q.trim()) {
    const term = q.trim();
    whereClause[Op.or] = [
      { title: { [Op.like]: `%${term}%` } },
      { description: { [Op.like]: `%${term}%` } },
      { original_filename: { [Op.like]: `%${term}%` } },
    ];
  }

  // Date range filtering
  if (dateFrom || dateTo) {
    whereClause.createdAt = {};
    if (dateFrom) {
      whereClause.createdAt[Op.gte] = new Date(dateFrom);
    }
    if (dateTo) {
      const endDate = new Date(dateTo);
      endDate.setHours(23, 59, 59, 999);
      whereClause.createdAt[Op.lte] = endDate;
    }
  }

  // Tag filtering
  const tagInclude = {
    model: Tag,
    as: 'tags',
    through: { attributes: [] },
    required: tagList.length > 0,
  };

  if (tagList.length > 0) {
    tagInclude.where = { name: { [Op.in]: tagList } };
  }

  const validSortFields = ['createdAt', 'updatedAt', 'title', 'file_size', 'taken_at'];
  const sortField = validSortFields.includes(sort) ? sort : 'createdAt';
  const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  let images, total;

  if (tagList.length > 1) {
    // For multiple tags, we need images that have ALL specified tags
    // First get image IDs that match all tags
    const tagMatchQuery = await sequelize.query(
      `SELECT it.image_id, COUNT(DISTINCT t.name) as tag_count
       FROM image_tags it
       JOIN tags t ON it.tag_id = t.id
       WHERE t.name IN (:tags)
       GROUP BY it.image_id
       HAVING tag_count = :tagCount`,
      {
        replacements: { tags: tagList, tagCount: tagList.length },
        type: sequelize.QueryTypes.SELECT,
      }
    );

    const matchingIds = tagMatchQuery.map((r) => r.image_id);

    if (matchingIds.length === 0) {
      const emptyResult = {
        images: [],
        total: 0,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: 0,
        query: { q, tags: tagList, sort, order, dateFrom, dateTo },
      };
      cacheService.set(cacheKey, emptyResult);
      return emptyResult;
    }

    whereClause.id = { [Op.in]: matchingIds };

    const result = await Image.findAndCountAll({
      where: whereClause,
      include: [{ model: Tag, as: 'tags', through: { attributes: [] } }],
      order: [[sortField, sortOrder]],
      limit: parseInt(limit),
      offset: parseInt(offset),
      distinct: true,
    });

    images = result.rows;
    total = result.count;
  } else {
    const result = await Image.findAndCountAll({
      where: whereClause,
      include: [tagInclude],
      order: [[sortField, sortOrder]],
      limit: parseInt(limit),
      offset: parseInt(offset),
      distinct: true,
    });

    images = result.rows;
    total = result.count;
  }

  const searchResult = {
    images,
    total,
    page: parseInt(page),
    limit: parseInt(limit),
    totalPages: Math.ceil(total / limit),
    query: { q, tags: tagList, sort, order, dateFrom, dateTo },
  };

  // Cache the result
  cacheService.set(cacheKey, searchResult);

  return searchResult;
}

/**
 * Get search suggestions based on partial query.
 * @param {string} term - Partial search term
 * @param {number} limit - Max suggestions
 * @returns {Object} { images, tags }
 */
async function getSuggestions(term, limit = 5) {
  if (!term || term.trim().length < 2) {
    return { images: [], tags: [] };
  }

  const cacheKey = cacheService.hashQuery({ suggestions: term.trim(), limit });
  const cached = cacheService.get(cacheKey);
  if (cached) return cached;

  const [images, tags] = await Promise.all([
    Image.findAll({
      where: {
        [Op.or]: [
          { title: { [Op.like]: `%${term}%` } },
          { original_filename: { [Op.like]: `%${term}%` } },
        ],
      },
      attributes: ['id', 'title', 'original_filename'],
      limit: parseInt(limit),
    }),
    Tag.findAll({
      where: { name: { [Op.like]: `%${term}%` } },
      attributes: ['id', 'name'],
      limit: parseInt(limit),
    }),
  ]);

  const result = { images, tags };
  cacheService.set(cacheKey, result, { ttl: 60 * 1000 }); // 1 min TTL for suggestions
  return result;
}

module.exports = {
  search,
  getSuggestions,
};