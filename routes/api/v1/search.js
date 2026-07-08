'use strict';

const express = require('express');
const router = express.Router();
const searchService = require('../../../services/searchService');
const { Image, Tag } = require('../../../models');
const { Op, fn, col, literal } = require('sequelize');

/**
 * GET /api/v1/search
 * Full-text search with filters
 */
router.get('/', async (req, res, next) => {
  try {
    const {
      q,
      tags,
      dateFrom,
      dateTo,
      minSize,
      maxSize,
      cameraMake,
      cameraModel,
      sort = 'createdAt',
      dir = 'desc',
      page = 1,
      limit = 20,
    } = req.query;

    const parsedPage = Math.max(1, parseInt(page) || 1);
    const parsedLimit = Math.min(100, Math.max(1, parseInt(limit) || 20));

    const searchParams = {
      q,
      tags: tags ? (Array.isArray(tags) ? tags : tags.split(',')) : undefined,
      dateFrom,
      dateTo,
      minSize: minSize ? parseInt(minSize) : undefined,
      maxSize: maxSize ? parseInt(maxSize) : undefined,
      cameraMake,
      cameraModel,
      sort,
      dir,
      page: parsedPage,
      limit: parsedLimit,
    };

    const results = await searchService.search(searchParams);

    res.json({
      data: results.images,
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        total: results.total,
        totalPages: Math.ceil(results.total / parsedLimit),
        hasNext: parsedPage < Math.ceil(results.total / parsedLimit),
        hasPrev: parsedPage > 1,
      },
      meta: {
        query: q || null,
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
        [fn('COUNT', col('images.id')), 'imageCount'],
      ],
      include: [
        {
          model: Image,
          as: 'images',
          attributes: [],
          through: { attributes: [] },
        },
      ],
      group: ['Tag.id'],
      order: [[literal('imageCount'), 'DESC']],
      limit: 20,
      subQuery: false,
    });

    // Camera makes
    const cameraMakes = await Image.findAll({
      attributes: [
        'cameraMake',
        [fn('COUNT', col('id')), 'count'],
      ],
      where: { cameraMake: { [Op.not]: null } },
      group: ['cameraMake'],
      order: [[literal('count'), 'DESC']],
      limit: 20,
      raw: true,
    });

    // Date range
    const dateRange = await Image.findOne({
      attributes: [
        [fn('MIN', col('created_at')), 'earliest'],
        [fn('MAX', col('created_at')), 'latest'],
      ],
      raw: true,
    });

    res.json({
      data: {
        tags: topTags,
        cameraMakes: cameraMakes.filter((c) => c.cameraMake),
        dateRange: {
          earliest: dateRange?.earliest || null,
          latest: dateRange?.latest || null,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;