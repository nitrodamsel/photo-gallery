const { Op, literal, fn, col, where } = require('sequelize');
const { Image, Tag, ImageTag, sequelize } = require('../models');

/**
 * Main search function
 * @param {Object} options - Structured search options from queryBuilder
 * @returns {{ rows: Image[], count: number, totalPages: number }}
 */
async function search({
  q = '',
  tags = [],
  dateFrom = null,
  dateTo = null,
  cameraMake = '',
  hasGps = null,
  page = 1,
  limit = 24,
  sortBy = 'relevance',
} = {}) {
  const offset = (page - 1) * limit;
  const conditions = [];
  const includeOptions = [];

  // Full-text search across filename, description, and EXIF data
  if (q && q.trim()) {
    const searchTerm = q.trim();
    const likeTerm = `%${searchTerm}%`;

    conditions.push({
      [Op.or]: [
        { originalName: { [Op.like]: likeTerm } },
        { description: { [Op.like]: likeTerm } },
        literal(`JSON_EXTRACT(exifData, '$.Make') LIKE '${escapeSql(likeTerm)}'`),
        literal(`JSON_EXTRACT(exifData, '$.Model') LIKE '${escapeSql(likeTerm)}'`),
        literal(`JSON_EXTRACT(exifData, '$.Software') LIKE '${escapeSql(likeTerm)}'`),
        literal(`JSON_EXTRACT(exifData, '$.Artist') LIKE '${escapeSql(likeTerm)}'`),
        literal(`JSON_EXTRACT(exifData, '$.Copyright') LIKE '${escapeSql(likeTerm)}'`),
      ],
    });
  }

  // Date range filter using uploadedAt
  if (dateFrom) {
    conditions.push({
      uploadedAt: { [Op.gte]: new Date(dateFrom) },
    });
  }
  if (dateTo) {
    // Include the full day of dateTo
    const toDate = new Date(dateTo);
    toDate.setHours(23, 59, 59, 999);
    conditions.push({
      uploadedAt: { [Op.lte]: toDate },
    });
  }

  // Camera make filter using EXIF data
  if (cameraMake && cameraMake.trim()) {
    conditions.push(
      literal(`JSON_EXTRACT(exifData, '$.Make') = '${escapeSql(cameraMake)}'`)
    );
  }

  // GPS presence filter
  if (hasGps === true) {
    conditions.push(
      literal(`(JSON_EXTRACT(exifData, '$.GPSLatitude') IS NOT NULL OR latitude IS NOT NULL)`)
    );
  } else if (hasGps === false) {
    conditions.push(
      literal(`(JSON_EXTRACT(exifData, '$.GPSLatitude') IS NULL AND (latitude IS NULL OR latitude = 0))`)
    );
  }

  // Tag filter — join via ImageTag
  if (tags && tags.length > 0) {
    // We'll use a subquery approach for filtering by tags
    const tagSubquery = `(
      SELECT DISTINCT image_id FROM image_tags
      INNER JOIN tags ON tags.id = image_tags.tag_id
      WHERE tags.name IN (${tags.map(t => `'${escapeSql(t)}'`).join(', ')})
      GROUP BY image_id
      HAVING COUNT(DISTINCT tags.name) = ${tags.length}
    )`;
    conditions.push(literal(`"Image"."id" IN ${tagSubquery}`));
  }

  // Build ORDER BY for relevance
  let order;
  if (q && q.trim()) {
    const searchTerm = escapeSql(q.trim());
    // Exact filename match ranks highest, then partial matches
    order = [
      literal(`CASE
        WHEN originalName = '${searchTerm}' THEN 0
        WHEN originalName LIKE '${escapeSql(q.trim())}%' THEN 1
        WHEN originalName LIKE '%${searchTerm}%' THEN 2
        WHEN description LIKE '%${searchTerm}%' THEN 3
        ELSE 4
      END`),
      ['uploadedAt', 'DESC'],
    ];
  } else {
    order = [['uploadedAt', 'DESC']];
  }

  // Include Tags for display
  includeOptions.push({
    model: Tag,
    as: 'tags',
    through: { attributes: [] },
    required: false,
  });

  const whereClause = conditions.length > 0 ? { [Op.and]: conditions } : {};

  const { rows, count } = await Image.findAndCountAll({
    where: whereClause,
    include: includeOptions,
    order,
    limit,
    offset,
    distinct: true,
  });

  const totalPages = Math.ceil(count / limit);

  return { rows, count, totalPages };
}

/**
 * Get facets for filter panel population
 * @returns {{ cameraMakes: string[], tags: { name: string, count: number }[] }}
 */
async function getFacets() {
  // Get distinct camera makes from EXIF data
  const cameraMakeRows = await Image.findAll({
    attributes: [
      [literal(`DISTINCT JSON_EXTRACT(exifData, '$.Make')`), 'make'],
    ],
    where: literal(`JSON_EXTRACT(exifData, '$.Make') IS NOT NULL`),
    raw: true,
  });

  const cameraMakes = cameraMakeRows
    .map(row => row.make)
    .filter(make => make && make.trim())
    .sort();

  // Get all tags with image counts
  const tags = await Tag.findAll({
    attributes: [
      'id',
      'name',
      [fn('COUNT', col('imageTags.imageId')), 'imageCount'],
    ],
    include: [
      {
        model: ImageTag,
        as: 'imageTags',
        attributes: [],
        required: false,
      },
    ],
    group: ['Tag.id'],
    order: [['name', 'ASC']],
    raw: true,
  });

  return {
    cameraMakes,
    tags: tags.map(t => ({
      id: t.id,
      name: t.name,
      count: parseInt(t.imageCount, 10) || 0,
    })),
  };
}

/**
 * Escape single quotes in SQL strings to prevent injection
 */
function escapeSql(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/'/g, "''");
}

module.exports = { search, getFacets };