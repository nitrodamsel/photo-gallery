'use strict';

const { Op, literal, fn, col } = require('sequelize');
const { Image, Tag, ImageTag } = require('../models');

/**
 * SearchService — builds Sequelize queries from structured search options
 * and returns paginated, relevance-sorted results.
 */

/**
 * Main search function.
 *
 * @param {object} opts
 * @param {string}   [opts.q]          - Free-text query
 * @param {string[]} [opts.tags]        - Array of tag slugs/names to filter by
 * @param {string}   [opts.dateFrom]    - ISO date string (inclusive lower bound on capturedAt / createdAt)
 * @param {string}   [opts.dateTo]      - ISO date string (inclusive upper bound)
 * @param {string}   [opts.cameraMake]  - Exact camera make string
 * @param {boolean}  [opts.hasGps]      - If true, only images with GPS data
 * @param {number}   [opts.page]        - 1-based page number (default 1)
 * @param {number}   [opts.limit]       - Results per page (default 24)
 * @returns {Promise<{rows: Image[], count: number, totalPages: number, page: number, limit: number}>}
 */
async function search(opts = {}) {
  const {
    q = '',
    tags = [],
    dateFrom = null,
    dateTo = null,
    cameraMake = '',
    hasGps = false,
    page = 1,
    limit = 24,
  } = opts;

  const offset = (page - 1) * limit;
  const conditions = [];

  // ── Free-text search ───────────────────────────────────────────────────────
  if (q && q.trim()) {
    const pattern = `%${q.trim()}%`;
    conditions.push({
      [Op.or]: [
        { originalName: { [Op.like]: pattern } },
        { description:  { [Op.like]: pattern } },
        // SQLite JSON_EXTRACT on the exifData JSON column
        literal(
          `JSON_EXTRACT(exifData, '$.Make') LIKE ${escapeSQLite(pattern)}`
        ),
        literal(
          `JSON_EXTRACT(exifData, '$.Model') LIKE ${escapeSQLite(pattern)}`
        ),
        literal(
          `JSON_EXTRACT(exifData, '$.ImageDescription') LIKE ${escapeSQLite(pattern)}`
        ),
        literal(
          `JSON_EXTRACT(exifData, '$.Artist') LIKE ${escapeSQLite(pattern)}`
        ),
        literal(
          `JSON_EXTRACT(exifData, '$.Copyright') LIKE ${escapeSQLite(pattern)}`
        ),
      ],
    });
  }

  // ── Date range ─────────────────────────────────────────────────────────────
  if (dateFrom || dateTo) {
    const dateCondition = {};
    if (dateFrom) dateCondition[Op.gte] = new Date(dateFrom);
    if (dateTo) {
      // Include the full end day
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      dateCondition[Op.lte] = end;
    }
    // Try capturedAt first; fall back to createdAt via OR
    conditions.push({
      [Op.or]: [
        { capturedAt: dateCondition },
        { createdAt:  dateCondition },
      ],
    });
  }

  // ── Camera make ────────────────────────────────────────────────────────────
  if (cameraMake && cameraMake.trim()) {
    conditions.push(
      literal(
        `JSON_EXTRACT(exifData, '$.Make') = ${escapeSQLite(cameraMake.trim())}`
      )
    );
  }

  // ── GPS presence ───────────────────────────────────────────────────────────
  if (hasGps) {
    conditions.push({
      [Op.and]: [
        { latitude:  { [Op.not]: null } },
        { longitude: { [Op.not]: null } },
      ],
    });
  }

  // ── Tag filter ─────────────────────────────────────────────────────────────
  // We resolve tags to their IDs then use a sub-query / required join
  let tagIds = [];
  if (tags && tags.length > 0) {
    const foundTags = await Tag.findAll({
      where: {
        [Op.or]: [
          { slug: { [Op.in]: tags } },
          { name: { [Op.in]: tags } },
        ],
      },
      attributes: ['id'],
    });
    tagIds = foundTags.map((t) => t.id);
  }

  // ── Build include ──────────────────────────────────────────────────────────
  const include = [
    {
      model: Tag,
      as: 'tags',
      through: { attributes: [] },
      required: tagIds.length > 0,
      ...(tagIds.length > 0 ? { where: { id: { [Op.in]: tagIds } } } : {}),
    },
  ];

  // ── Relevance ORDER BY ─────────────────────────────────────────────────────
  // Exact filename match → score 2, partial text match in name → score 1, else 0
  const relevanceExpr = q && q.trim()
    ? literal(
        `CASE
           WHEN originalName = ${escapeSQLite(q.trim())} THEN 2
           WHEN originalName LIKE ${escapeSQLite(`%${q.trim()}%`)} THEN 1
           ELSE 0
         END`
      )
    : literal('0');

  // ── Execute query ──────────────────────────────────────────────────────────
  const where = conditions.length > 0 ? { [Op.and]: conditions } : {};

  // When tag filtering is active we can get duplicate rows (one per matching tag).
  // Use findAndCountAll with distinct:true to avoid inflating the count.
  const { count, rows } = await Image.findAndCountAll({
    where,
    include,
    distinct: true,
    order: [
      [relevanceExpr, 'DESC'],
      ['createdAt', 'DESC'],
    ],
    limit,
    offset,
    subQuery: false, // needed when combining LIMIT with a JOIN on has-many
  });

  // If multiple tags required (ALL tags must match), filter post-query.
  // Sequelize's required join gives us images matching ANY of the tag IDs.
  // For ALL-match semantics we need an extra pass:
  let finalRows = rows;
  if (tagIds.length > 1) {
    finalRows = rows.filter((img) => {
      const imgTagIds = img.tags.map((t) => t.id);
      return tagIds.every((id) => imgTagIds.includes(id));
    });
  }

  const totalPages = Math.ceil(count / limit);

  return {
    rows: finalRows,
    count,
    totalPages,
    page,
    limit,
  };
}

/**
 * Returns distinct camera make values stored in exifData JSON.
 */
async function getDistinctCameraMakes() {
  const [results] = await Image.sequelize.query(
    `SELECT DISTINCT JSON_EXTRACT(exifData, '$.Make') AS make
     FROM Images
     WHERE JSON_EXTRACT(exifData, '$.Make') IS NOT NULL
     ORDER BY make ASC`
  );
  return results.map((r) => r.make).filter(Boolean);
}

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Very small SQLite string escaper for use inside literal().
 * Only used for values we've already sanitised (trimmed strings from opts).
 */
function escapeSQLite(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

module.exports = { search, getDistinctCameraMakes };