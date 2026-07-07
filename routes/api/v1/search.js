'use strict';

const express = require('express');
const router = express.Router();
const { Image, Tag, sequelize } = require('../../../models');
const { Op, fn, col, literal } = require('sequelize');

// Helper: standard error response
function apiError(res, status, code, message) {
  return res.status(status).json({ error: { code, message } });
}

// Helper: build pagination meta
function paginationMeta(page, limit, total) {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    hasNext: page * limit < total,
    hasPrev: page > 1,
  };
}

// GET /api/v1/search — search images with full filter support
router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const where = {};
    const tagWhere = {};

    // Text search
    if (req.query.q) {
      where[Op.or] = [
        { title: { [Op.like]: `%${req.query.q}%` } },
        { description: { [Op.like]: `%${req.query.q}%` } },
        { originalName: { [Op.like]: `%${req.query.q}%` } },
      ];
    }

    // Filter by tag name
    if (req.query.tag) {
      tagWhere.name = req.query.tag.toLowerCase();
    }

    // Filter by date range
    if (req.query.dateFrom || req.query.dateTo) {
      where.createdAt = {};
      if (req.query.dateFrom) {
        where.createdAt[Op.gte] = new Date(req.query.dateFrom);
      }
      if (req.query.dateTo) {
        where.createdAt[Op.lte] = new Date(req.query.dateTo);
      }
    }

    // Filter by mime type
    if (req.query.mimeType) {
      where.mimeType = req.query.mimeType;
    }

    // Sort
    const sortField = ['createdAt', 'title', 'fileSize'].includes(req.query.sort)
      ? req.query.sort
      : 'createdAt';
    const sortOrder = req.query.order === 'asc' ? 'ASC' : 'DESC';

    const tagInclude = {
      model: Tag,
      as: 'tags',
      through: { attributes: [] },
      ...(Object.keys(tagWhere).length > 0 ? { where: tagWhere } : {}),
    };

    const { count, rows } = await Image.findAndCountAll({
      where,
      include: [tagInclude],
      limit,
      offset,
      order: [[sortField, sortOrder]],
      distinct: true,
    });

    return res.json({
      data: rows,
      pagination: paginationMeta(page, limit, count),
      query: req.query,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/search/facets — get search facets (aggregated filter options)
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
    });

    // Mime types
    const mimeTypes = await Image.findAll({
      attributes: [
        'mimeType',
        [fn('COUNT', col('id')), 'count'],
      ],
      group: ['mimeType'],
      order: [[literal('count'), 'DESC']],
      raw: true,
    });

    // Date range
    const dateRange = await Image.findOne({
      attributes: [
        [fn('MIN', col('createdAt')), 'oldest'],
        [fn('MAX', col('createdAt')), 'newest'],
      ],
      raw: true,
    });

    return res.json({
      data: {
        tags: topTags,
        mimeTypes,
        dateRange,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;