'use strict';

const express = require('express');
const router = express.Router();
const searchService = require('../../../services/searchService');
const { Image, Tag, ImageTag, sequelize } = require('../../../models');
const { Op } = require('sequelize');

// GET /api/v1/search — full filter search
router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));

    const filters = {
      query: req.query.q || req.query.query || '',
      tags: req.query.tags ? req.query.tags.split(',').map((t) => t.trim()) : [],
      cameraMake: req.query.cameraMake || null,
      cameraModel: req.query.cameraModel || null,
      dateFrom: req.query.dateFrom || null,
      dateTo: req.query.dateTo || null,
      minRating: req.query.minRating ? parseInt(req.query.minRating) : null,
      sortBy: req.query.sortBy || 'createdAt',
      sortOrder: req.query.sortOrder || 'DESC',
      page,
      limit,
    };

    const results = await searchService.search(filters);

    res.json({
      data: results.images,
      pagination: {
        total: results.total,
        page,
        limit,
        pages: Math.ceil(results.total / limit),
      },
      filters,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/search/facets — get available filter facets
router.get('/facets', async (req, res, next) => {
  try {
    // Get camera makes
    const cameraMakes = await Image.findAll({
      attributes: [
        [sequelize.fn('DISTINCT', sequelize.col('cameraMake')), 'cameraMake'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      ],
      where: { cameraMake: { [Op.ne]: null } },
      group: ['cameraMake'],
      order: [[sequelize.literal('count'), 'DESC']],
      raw: true,
    });

    // Get top tags
    const topTags = await Tag.findAll({
      attributes: [
        'id',
        'name',
        'slug',
        [sequelize.fn('COUNT', sequelize.col('ImageTags.imageId')), 'imageCount'],
      ],
      include: [{ model: ImageTag, attributes: [], required: true }],
      group: ['Tag.id'],
      order: [[sequelize.literal('imageCount'), 'DESC']],
      limit: 50,
      subQuery: false,
    });

    // Get date range
    const dateRange = await Image.findOne({
      attributes: [
        [sequelize.fn('MIN', sequelize.col('createdAt')), 'earliest'],
        [sequelize.fn('MAX', sequelize.col('createdAt')), 'latest'],
      ],
      raw: true,
    });

    res.json({
      data: {
        cameraMakes: cameraMakes.map((r) => ({ value: r.cameraMake, count: parseInt(r.count) })),
        tags: topTags,
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