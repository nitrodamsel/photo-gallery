'use strict';

const express = require('express');
const router = express.Router();
const searchService = require('../../../services/searchService');
const { Image, Tag, sequelize } = require('../../../models');
const { Op, fn, col, literal } = require('sequelize');

/**
 * GET /api/v1/search
 * Full-text search with filter support
 */
router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const filters = {
      q: req.query.q || '',
      tags: req.query.tags ? req.query.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      cameraMake: req.query.cameraMake || null,
      cameraModel: req.query.cameraModel || null,
      dateFrom: req.query.dateFrom || null,
      dateTo: req.query.dateTo || null,
      sortBy: req.query.sortBy || 'createdAt',
      sortDir: req.query.sortDir === 'asc' ? 'ASC' : 'DESC',
    };

    const where = {};

    // Full-text search
    if (filters.q) {
      where[Op.or] = [
        { originalName: { [Op.iLike]: `%${filters.q}%` } },
        { description: { [Op.iLike]: `%${filters.q}%` } },
        { title: { [Op.iLike]: `%${filters.q}%` } },
      ];
    }

    // Camera filters
    if (filters.cameraMake) {
      where.cameraMake = { [Op.iLike]: `%${filters.cameraMake}%` };
    }
    if (filters.cameraModel) {
      where.cameraModel = { [Op.iLike]: `%${filters.cameraModel}%` };
    }

    // Date range
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt[Op.gte] = new Date(filters.dateFrom);
      if (filters.dateTo) where.createdAt[Op.lte] = new Date(filters.dateTo);
    }

    // Tag filtering
    const include = [
      {
        model: Tag,
        as: 'tags',
        through: { attributes: [] },
        ...(filters.tags.length > 0
          ? {
              where: { name: { [Op.in]: filters.tags } },
              required: true,
            }
          : {}),
      },
    ];

    const { count, rows } = await Image.findAndCountAll({
      where,
      include,
      limit,
      offset,
      order: [[filters.sortBy, filters.sortDir]],
      distinct: true,
    });

    res.json({
      data: rows,
      query: filters,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit),
        hasNext: page * limit < count,
        hasPrev: page > 1,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/search/facets
 * Get search facets for filtering UI
 */
router.get('/facets', async (req, res, next) => {
  try {
    // Top tags
    const topTags = await Tag.findAll({
      attributes: [
        'id',
        'name',
        [
          require('sequelize').literal(
            '(SELECT COUNT(*) FROM image_tags WHERE image_tags."tagId" = "Tag"."id")'
          ),
          'imageCount',
        ],
      ],
      order: [[require('sequelize').literal('"imageCount"'), 'DESC']],
      limit: 20,
    });

    // Camera makes
    const cameraMakes = await Image.findAll({
      attributes: [
        'cameraMake',
        [fn('COUNT', col('id')), 'count'],
      ],
      where: {
        cameraMake: { [Op.ne]: null },
      },
      group: ['cameraMake'],
      order: [[fn('COUNT', col('id')), 'DESC']],
      limit: 20,
      raw: true,
    });

    // Camera models
    const cameraModels = await Image.findAll({
      attributes: [
        'cameraModel',
        [fn('COUNT', col('id')), 'count'],
      ],
      where: {
        cameraModel: { [Op.ne]: null },
      },
      group: ['cameraModel'],
      order: [[fn('COUNT', col('id')), 'DESC']],
      limit: 20,
      raw: true,
    });

    res.json({
      data: {
        tags: topTags,
        cameraMakes,
        cameraModels,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;