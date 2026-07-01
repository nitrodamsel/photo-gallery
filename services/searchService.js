const { Op, literal, fn, col } = require('sequelize');
const { Image, Tag, ImageTag, sequelize } = require('../models');

/**
 * Main search function
 * @param {Object} options
 * @param {string} options.q - text query
 * @param {string[]} options.tags - array of tag names
 * @param {string} options.dateFrom - ISO date string
 * @param {string} options.dateTo - ISO date string
 * @param {string} options.cameraMake - camera make filter
 * @param {boolean} options.hasGps - filter images with GPS data
 * @param {number} options.page - page number (1-based)
 * @param {number} options.limit - results per page
 * @returns {{ rows: Image[], count: number, totalPages: number }}
 */
async function search({ q, tags, dateFrom, dateTo, cameraMake, hasGps, page = 1, limit = 24 } = {}) {
  const where = {};
  const andConditions = [];
  const include = [
    {
      model: Tag,
      as: 'tags',
      through: { attributes: [] },
      required: false,
    },
  ];

  // Text search across originalName, description, and EXIF data
  if (q && q.trim()) {
    const term = q.trim();
    andConditions.push({
      [Op.or]: [
        { originalName: { [Op.like]: `%${term}%` } },
        { description: { [Op.like]: `%${term}%` } },
        literal(`JSON_EXTRACT(exifData, '$.Make') LIKE '%${term.replace(/'/g, "''")}%'`),
        literal(`JSON_EXTRACT(exifData, '$.Model') LIKE '%${term.replace(/'/g, "''")}%'`),
        literal(`JSON_EXTRACT(exifData, '$.LensModel') LIKE '%${term.replace(/'/g, "''")}%'`),
      ],
    });
  }

  // Date range filter
  if (dateFrom || dateTo) {
    const dateCondition = {};
    if (dateFrom) {
      dateCondition[Op.gte] = new Date(dateFrom);
    }
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      dateCondition[Op.lte] = toDate;
    }
    andConditions.push({ createdAt: dateCondition });
  }

  // Camera make filter
  if (cameraMake && cameraMake !== 'any' && cameraMake !== '') {
    andConditions.push(
      literal(`JSON_EXTRACT(exifData, '$.Make') = '${cameraMake.replace(/'/g, "''")}'`)
    );
  }

  // Has GPS filter
  if (hasGps === true || hasGps === 'true') {
    andConditions.push({ gpsLat: { [Op.not]: null } });
    andConditions.push({ gpsLng: { [Op.not]: null } });
  }

  // Tag filter
  if (tags && tags.length > 0) {
    const tagList = Array.isArray(tags) ? tags : [tags];
    // Require ALL specified tags (AND logic)
    for (const tagName of tagList) {
      andConditions.push(
        literal(
          `EXISTS (
            SELECT 1 FROM image_tags it
            JOIN tags t ON it.tag_id = t.id
            WHERE it.image_id = Image.id
            AND t.name = '${tagName.replace(/'/g, "''")}'
          )`
        )
      );
    }
  }

  if (andConditions.length > 0) {
    where[Op.and] = andConditions;
  }

  // Build ORDER BY for relevance
  // Exact filename match ranks highest, then partial matches
  let order = [['createdAt', 'DESC']];
  if (q && q.trim()) {
    const term = q.trim().replace(/'/g, "''");
    order = [
      [
        literal(`CASE
          WHEN originalName = '${term}' THEN 0
          WHEN originalName LIKE '${term}%' THEN 1
          WHEN originalName LIKE '%${term}%' THEN 2
          ELSE 3
        END`),
        'ASC',
      ],
      ['createdAt', 'DESC'],
    ];
  }

  const offset = (page - 1) * limit;

  const { rows, count } = await Image.findAndCountAll({
    where,
    include,
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
 * Returns distinct camera makes and all tags with counts
 */
async function getFacets() {
  // Distinct camera makes from EXIF data
  const cameraMakeResults = await Image.findAll({
    attributes: [[literal(`DISTINCT JSON_EXTRACT(exifData, '$.Make')`), 'cameraMake']],
    where: {
      exifData: { [Op.not]: null },
      [Op.and]: [literal(`JSON_EXTRACT(exifData, '$.Make') IS NOT NULL`)],
    },
    raw: true,
  });

  const cameraMakes = cameraMakeResults
    .map((r) => r.cameraMake)
    .filter((v) => v && v.trim() !== '')
    .sort();

  // Tags with image counts
  const tags = await Tag.findAll({
    include: [
      {
        model: Image,
        as: 'images',
        through: { attributes: [] },
        attributes: [],
        required: false,
      },
    ],
    attributes: ['id', 'name', 'slug', [fn('COUNT', col('images.id')), 'imageCount']],
    group: ['Tag.id'],
    order: [['name', 'ASC']],
    raw: false,
  });

  return {
    cameraMakes,
    tags: tags.map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      count: parseInt(t.get('imageCount')) || 0,
    })),
  };
}

module.exports = { search, getFacets };