'use strict';

const express = require('express');
const router = express.Router();
const { Image, Tag, ImageTag } = require('../../../models');
const { Op, fn, col, literal } = require('sequelize');
const searchService = require('../../../services/searchService');

// GET /api/v1/search - Search images with full filter support
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const filters = {
      query: req.query.q || req.query.query || '',
      tags: req.query.tags ? req.query.tags.split(',').map((t) => t.trim()) : [],
      mimeType: req.query.mimeType || null,
      dateFrom: req.query.dateFrom || null,
      dateTo: req.query.dateTo || null,
      cameraMake: req.query.cameraMake || null,
      cameraModel: req.query.cameraModel || null,
      sortBy: req.query.sortBy || 'createdAt',
      sortOrder: req.query.sortOrder === 'asc' ? 'ASC' : 'DESC',
    };

    const where = {};
    const include = [
      {
        model: Tag,
        through: { attributes: [] },
        attributes: ['id', 'name', 'slug'],
      },
    ];

    // Text search
    if (filters.query) {
      where[Op.or] = [
        { originalName: { [Op.like]: `%${filters.query}%` } },
        { title: { [Op.like]: `%${filters.query}%` } },
        { description: { [Op.like]: `%${filters.query}%` } },
      ];
    }

    // MIME type filter
    if (filters.mimeType) {
      where.mimeType = filters.mimeType;
    }

    // Date range filter
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) {
        where.createdAt[Op.gte] = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        where.createdAt[Op.lte] = new Date(filters.dateTo);
      }
    }

    // Camera make filter
    if (filters.cameraMake) {
      where.cameraMake = { [Op.like]: `%${filters.cameraMake}%` };
    }

    // Camera model filter
    if (filters.cameraModel) {
      where.cameraModel = { [Op.like]: `%${filters.cameraModel}%` };
    }

    // Tag filter
    if (filters.tags.length > 0) {
      include[0].where = { slug: { [Op.in]: filters.tags } };
      include[0].required = true;
    }

    // Validate sort field
    const allowedSortFields = ['createdAt', 'updatedAt', 'originalName', 'fileSize', 'title'];
    const sortBy = allowedSortFields.includes(filters.sortBy) ? filters.sortBy : 'createdAt';

    const { count, rows } = await Image.findAndCountAll({
      where,
      include,
      limit,
      offset,
      order: [[sortBy, filters.sortOrder]],
      distinct: true,
    });

    return res.json({
      data: rows,
      filters: filters,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit),
        hasNextPage: page < Math.ceil(count / limit),
        hasPrevPage: page > 1,
      },
    });
  } catch (err) {
    console.error('GET /api/v1/search error:', err);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Search failed.' },
    });
  }
});

// GET /api/v1/search/facets - Get search facets (aggregates for filtering)
router.get('/facets', async (req, res) => {
  try {
    const { sequelize } = require('../../../models');

    // Get MIME types with counts
    const mimeTypes = await Image.findAll({
      attributes: ['mimeType', [fn('COUNT', col('id')), 'count']],
      group: ['mimeType'],
      order: [[fn('COUNT', col('id')), 'DESC']],
      raw: true,
    });

    // Get camera makes with counts
    const cameraMakes = await Image.findAll({
      attributes: ['cameraMake', [fn('COUNT', col('id')), 'count']],
      where: { cameraMake: { [Op.ne]: null } },
      group: ['cameraMake'],
      order: [[fn('COUNT', col('id')), 'DESC']],
      limit: 20,
      raw: true,
    });

    // Get top tags
    const topTags = await Tag.findAll({
      attributes: [
        'id',
        'name',
        'slug',
        [fn('COUNT', col('ImageTags.imageId')), 'imageCount'],
      ],
      include: [
        {
          model: Image,
          through: { attributes: [] },
          attributes: [],
          required: false,
        },
      ],
      group: ['Tag.id'],
      order: [[fn('COUNT', col('ImageTags.imageId')), 'DESC']],
      limit: 20,
    });

    // Get date range
    const dateRange = await Image.findOne({
      attributes: [
        [fn('MIN', col('createdAt')), 'earliest'],
        [fn('MAX', col('createdAt')), 'latest'],
      ],
      raw: true,
    });

    return res.json({
      data: {
        mimeTypes: mimeTypes.map((m) => ({ value: m.mimeType, count: parseInt(m.count) })),
        cameraMakes: cameraMakes.map((c) => ({
          value: c.cameraMake,
          count: parseInt(c.count),
        })),
        topTags: topTags.map((t) => ({
          id: t.id,
          name: t.name,
          slug: t.slug,
          count: parseInt(t.getDataValue('imageCount') || 0),
        })),
        dateRange: {
          earliest: dateRange?.earliest || null,
          latest: dateRange?.latest || null,
        },
      },
    });
  } catch (err) {
    console.error('GET /api/v1/search/facets error:', err);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch facets.' },
    });
  }
});

module.exports = router;