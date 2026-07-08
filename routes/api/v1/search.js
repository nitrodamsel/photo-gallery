'use strict';

const express = require('express');
const router = express.Router();
const { Image, Tag, ImageTag, sequelize } = require('../../../models');
const { Op, fn, col, literal } = require('sequelize');

/**
 * GET /api/v1/search
 * Search images with full filter support
 */
router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const where = {};
    const tagWhere = {};

    if (req.query.q) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${req.query.q}%` } },
        { originalName: { [Op.iLike]: `%${req.query.q}%` } },
        { description: { [Op.iLike]: `%${req.query.q}%` } },
      ];
    }

    if (req.query.mimeType) {
      where.mimeType = req.query.mimeType;
    }

    if (req.query.dateFrom || req.query.dateTo) {
      where.createdAt = {};
      if (req.query.dateFrom) where.createdAt[Op.gte] = new Date(req.query.dateFrom);
      if (req.query.dateTo) where.createdAt[Op.lte] = new Date(req.query.dateTo);
    }

    if (req.query.minSize || req.query.maxSize) {
      where.fileSize = {};
      if (req.query.minSize) where.fileSize[Op.gte] = parseInt(req.query.minSize);
      if (req.query.maxSize) where.fileSize[Op.lte] = parseInt(req.query.maxSize);
    }

    const include = [
      {
        model: Tag,
        as: 'tags',
        through: { attributes: [] },
        ...(req.query.tags
          ? {
              where: { name: { [Op.in]: req.query.tags.split(',').map((t) => t.trim()) } },
              required: true,
            }
          : {}),
      },
    ];

    const sortField = req.query.sortBy || 'createdAt';
    const sortDir = req.query.sortDir === 'asc' ? 'ASC' : 'DESC';
    const allowedSorts = ['createdAt', 'title', 'fileSize', 'originalName'];
    const order = [[allowedSorts.includes(sortField) ? sortField : 'createdAt', sortDir]];

    const { count, rows } = await Image.findAndCountAll({
      where,
      include,
      limit,
      offset,
      order,
      distinct: true,
    });

    res.json({
      data: rows,
      query: req.query,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit),
        hasNext: page < Math.ceil(count / limit),
        hasPrev: page > 1,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/search/facets
 * Get aggregated facets for filtering UI
 */
router.get('/facets', async (req, res, next) => {
  try {
    // Get MIME type distribution
    const mimeTypes = await Image.findAll({
      attributes: ['mimeType', [fn('COUNT', col('id')), 'count']],
      group: ['mimeType'],
      order: [[literal('count'), 'DESC']],
      raw: true,
    });

    // Get top tags
    const topTags = await Tag.findAll({
      attributes: [
        'id',
        'name',
        [fn('COUNT', col('images.id')), 'imageCount'],
      ],
      include: [
        {
          model: Image,
          as: 'images',
          through: { attributes: [] },
          attributes: [],
        },
      ],
      group: ['Tag.id'],
      order: [[literal('"imageCount"'), 'DESC']],
      limit: 20,
      subQuery: false,
    });

    // Get date range
    const dateRange = await Image.findOne({
      attributes: [
        [fn('MIN', col('createdAt')), 'earliest'],
        [fn('MAX', col('createdAt')), 'latest'],
      ],
      raw: true,
    });

    // Get size distribution
    const sizeStats = await Image.findOne({
      attributes: [
        [fn('MIN', col('fileSize')), 'minSize'],
        [fn('MAX', col('fileSize')), 'maxSize'],
        [fn('AVG', col('fileSize')), 'avgSize'],
      ],
      raw: true,
    });

    res.json({
      data: {
        mimeTypes,
        topTags,
        dateRange,
        sizeStats,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;