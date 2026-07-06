const { Image, Tag, sequelize } = require('../models');
const { Op } = require('sequelize');
const cacheService = require('./cacheService');

/**
 * Full-text / multi-field search for images.
 * Results are cached using an LRU cache.
 *
 * @param {object} params - Search parameters
 * @param {string} params.query - Search term
 * @param {number} [params.page=1]
 * @param {number} [params.limit=24]
 * @param {string[]} [params.tags=[]] - Tag names to filter by
 * @param {string} [params.sortBy='created_at']
 * @param {string} [params.sortOrder='DESC']
 * @param {string} [params.startDate]
 * @param {string} [params.endDate]
 * @returns {Promise<{images: Image[], total: number, page: number, limit: number, totalPages: number, query: string}>}
 */
async function search(params = {}) {
  const cacheKey = `search:${cacheService.hashQuery(params)}`;
  const cached = cacheService.get(cacheKey);
  if (cached) {
    return cached;
  }

  const {
    query = '',
    page = 1,
    limit = 24,
    tags = [],
    sortBy = 'created_at',
    sortOrder = 'DESC',
    startDate = null,
    endDate = null,
  } = params;

  const offset = (page - 1) * limit;
  const where = {};

  // Text search across multiple fields
  if (query && query.trim()) {
    const term = query.trim();
    where[Op.or] = [
      { title: { [Op.iLike]: `%${term}%` } },
      { description: { [Op.iLike]: `%${term}%` } },
      { original_filename: { [Op.iLike]: `%${term}%` } },
      { camera_make: { [Op.iLike]: `%${term}%` } },
      { camera_model: { [Op.iLike]: `%${term}%` } },
    ];
  }

  // Date range filter
  if (startDate || endDate) {
    where.created_at = {};
    if (startDate) where.created_at[Op.gte] = new Date(startDate);
    if (endDate) where.created_at[Op.lte] = new Date(endDate);
  }

  // Tag filter
  const tagIncludeOptions = {
    model: Tag,
    as: 'tags',
    through: { attributes: [] },
    required: false,
  };

  if (tags && tags.length > 0) {
    tagIncludeOptions.where = { name: { [Op.in]: tags } };
    tagIncludeOptions.required = true;
  }

  const validSortColumns = ['created_at', 'updated_at', 'title', 'file_size', 'original_filename'];
  const safeSortBy = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
  const safeSortOrder = ['ASC', 'DESC'].includes(sortOrder.toUpperCase())
    ? sortOrder.toUpperCase()
    : 'DESC';

  const { count, rows } = await Image.findAndCountAll({
    where,
    include: [tagIncludeOptions],
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
    query,
  };

  cacheService.set(cacheKey, result);
  return result;
}

/**
 * Get search suggestions based on partial query.
 * @param {string} term
 * @param {number} [maxResults=10]
 * @returns {Promise<string[]>}
 */
async function getSuggestions(term, maxResults = 10) {
  if (!term || term.trim().length < 2) return [];

  const cacheKey = `suggestions:${cacheService.hashQuery({ term, maxResults })}`;
  const cached = cacheService.get(cacheKey);
  if (cached) return cached;

  const cleanTerm = term.trim();

  // Search tags
  const matchingTags = await Tag.findAll({
    where: { name: { [Op.iLike]: `%${cleanTerm}%` } },
    limit: maxResults,
    attributes: ['name'],
    order: [['name', 'ASC']],
  });

  // Search image titles
  const matchingTitles = await Image.findAll({
    where: {
      title: { [Op.iLike]: `%${cleanTerm}%` },
    },
    limit: maxResults,
    attributes: ['title'],
    order: [['title', 'ASC']],
  });

  const suggestions = [
    ...matchingTags.map((t) => ({ type: 'tag', value: t.name })),
    ...matchingTitles.map((i) => ({ type: 'title', value: i.title })),
  ].slice(0, maxResults);

  cacheService.set(cacheKey, suggestions);
  return suggestions;
}

module.exports = {
  search,
  getSuggestions,
};