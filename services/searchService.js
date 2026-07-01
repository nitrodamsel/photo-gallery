const { Op, literal, fn, col } = require('sequelize');
const { Image, Tag, ImageTag } = require('../models');

/**
 * Search service that accepts a structured query object and returns paginated results.
 */

async function search({
  q = '',
  tags = [],
  dateFrom = null,
  dateTo = null,
  cameraMake = '',
  hasGps = false,
  page = 1,
  limit = 24,
  sortBy = 'relevance',
} = {}) {
  const offset = (page - 1) * limit;
  const whereConditions = [];

  // Full-text search across filename, description, and EXIF data
  if (q && q.trim()) {
    const searchTerm = q.trim();
    const likePattern = `%${searchTerm}%`;

    whereConditions.push({
      [Op.or]: [
        { originalName: { [Op.like]: likePattern } },
        { description: { [Op.like]: likePattern } },
        literal(`JSON_EXTRACT(exifData, '$.Make') LIKE '${escapeLike(searchTerm)}'`),
        literal(`JSON_EXTRACT(exifData, '$.Model') LIKE '${escapeLike(searchTerm)}'`),
        literal(`JSON_EXTRACT(exifData, '$.ImageDescription') LIKE '${escapeLike(searchTerm)}'`),
        literal(`JSON_EXTRACT(exifData, '$.Artist') LIKE '${escapeLike(searchTerm)}'`),
        literal(`JSON_EXTRACT(exifData, '$.Copyright') LIKE '${escapeLike(searchTerm)}'`),
      ],
    });
  }

  // Date range filter
  if (dateFrom || dateTo) {
    const dateCondition = {};
    if (dateFrom) dateCondition[Op.gte] = new Date(dateFrom);
    if (dateTo) {
      const endDate = new Date(dateTo);
      endDate.setHours(23, 59, 59, 999);
      dateCondition[Op.lte] = endDate;
    }
    whereConditions.push({ createdAt: dateCondition });
  }

  // Camera make filter
  if (cameraMake && cameraMake.trim()) {
    whereConditions.push(
      literal(`JSON_EXTRACT(exifData, '$.Make') = '${escapeString(cameraMake.trim())}'`)
    );
  }

  // GPS presence filter
  if (hasGps) {
    whereConditions.push(
      literal(`(JSON_EXTRACT(exifData, '$.GPSLatitude') IS NOT NULL OR JSON_EXTRACT(exifData, '$.latitude') IS NOT NULL OR latitude IS NOT NULL)`)
    );
  }

  // Tag filter — require all selected tags
  let includeOptions = [
    {
      model: Tag,
      as: 'tags',
      through: { attributes: [] },
      attributes: ['id', 'name', 'color'],
      required: false,
    },
  ];

  const tagIds = Array.isArray(tags) ? tags.map(Number).filter(Boolean) : [];

  if (tagIds.length > 0) {
    // Use a subquery approach: image must have all requested tags
    tagIds.forEach((tagId) => {
      whereConditions.push(
        literal(
          `EXISTS (SELECT 1 FROM image_tags WHERE image_tags.imageId = Image.id AND image_tags.tagId = ${tagId})`
        )
      );
    });
  }

  // Build ORDER BY for relevance
  let order = [];
  if (q && q.trim()) {
    const searchTerm = q.trim();
    const exactPattern = searchTerm;
    // Exact filename match ranks highest, then partial matches
    order.push([
      literal(
        `CASE 
          WHEN originalName = '${escapeString(exactPattern)}' THEN 0
          WHEN originalName LIKE '${escapeLike(exactPattern)}' THEN 1
          WHEN description LIKE '${escapeLike(exactPattern)}' THEN 2
          ELSE 3
        END`
      ),
      'ASC',
    ]);
  }

  // Secondary sort
  if (sortBy === 'date_desc' || (sortBy === 'relevance' && !q)) {
    order.push(['createdAt', 'DESC']);
  } else if (sortBy === 'date_asc') {
    order.push(['createdAt', 'ASC']);
  } else if (sortBy === 'name') {
    order.push(['originalName', 'ASC']);
  } else {
    order.push(['createdAt', 'DESC']);
  }

  const where = whereConditions.length > 0 ? { [Op.and]: whereConditions } : {};

  const { rows, count } = await Image.findAndCountAll({
    where,
    include: includeOptions,
    order,
    limit,
    offset,
    distinct: true,
  });

  const totalPages = Math.ceil(count / limit);

  return {
    rows,
    count,
    totalPages,
    page,
    limit,
  };
}

/**
 * Get distinct camera makes from the database for filter population.
 */
async function getDistinctCameraMakes() {
  const results = await Image.findAll({
    attributes: [[literal(`DISTINCT JSON_EXTRACT(exifData, '$.Make')`), 'make']],
    where: literal(`JSON_EXTRACT(exifData, '$.Make') IS NOT NULL`),
    raw: true,
  });

  return results
    .map((r) => r.make)
    .filter(Boolean)
    .sort();
}

/**
 * Get search facets: camera makes and tags with counts.
 */
async function getFacets() {
  const [cameraMakes, tags] = await Promise.all([
    getDistinctCameraMakes(),
    Tag.findAll({
      attributes: [
        'id',
        'name',
        'color',
        [fn('COUNT', col('images.id')), 'imageCount'],
      ],
      include: [
        {
          model: Image,
          as: 'images',
          attributes: [],
          through: { attributes: [] },
          required: false,
        },
      ],
      group: ['Tag.id'],
      order: [['name', 'ASC']],
    }),
  ]);

  return {
    cameraMakes,
    tags: tags.map((t) => ({
      id: t.id,
      name: t.name,
      color: t.color,
      imageCount: parseInt(t.get('imageCount')) || 0,
    })),
  };
}

// Escape string for use in SQL LIKE patterns
function escapeLike(str) {
  return str.replace(/'/g, "''").replace(/%/g, '\\%').replace(/_/g, '\\_');
}

// Escape string for SQL equality
function escapeString(str) {
  return str.replace(/'/g, "''");
}

module.exports = { search, getFacets, getDistinctCameraMakes };