'use strict';

const express = require('express');
const router = express.Router();
const { Image, Tag, sequelize } = require('../../../models');
const { Op } = require('sequelize');
const searchService = require('../../../services/searchService');

function apiError(res, status, code, message) {
  return res.status(status).json({ error: { code, message } });
}

function getPagination(query) {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

/**
 * GET /api/v1/search
 * Full-text search with filters
 */
router.get('/', async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req.query);
    const { q, tag, dateFrom, dateTo, mimeType, sort = 'createdAt', order = 'DESC' } = req.query;

    const where = {};
    const tagFilter = [];

    if (q) {
      where[Op.or] = [
        { originalName: { [Op.iLike]: `%${q}%` } },
        { title: { [Op.iLike]: `%${q}%` } },
        { description: { [Op.iLike]: `%${q}%` } },
      ];
    }

    if (mimeType) {
      where.mimeType = { [Op.iLike]: `${mimeType}%` };
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt[Op.gte] = new Date(dateFrom);
      if (dateTo) where.createdAt[Op.lte] = new Date(dateTo);
    }

    const include = [
      {
        model: Tag,
        as: 'tags',
        through: { attributes: [] },
        ...(tag ? { where: { name: tag } } : {}),
        required: !!tag,
      },
    ];

    const validSortFields = ['createdAt', 'fileSize', 'originalName', 'title'];
    const sortField = validSortFields.includes(sort) ? sort : 'createdAt';
    const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const { count, rows } = await Image.findAndCountAll({
      where,
      include,
      order: [[sortField, sortOrder]],
      limit,
      offset,
      distinct: true,
    });

    return res.json({
      data: rows,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit),
      },
      query: { q, tag, dateFrom, dateTo, mimeType, sort: sortField, order: sortOrder },
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /api/v1/search/facets
 * Return facet counts for filtering
 */
router.get('/facets', async (req, res, next) => {
  try {
    // Top tags by image count
    const topTags = await Tag.findAll({
      include: [
        {
          model: Image,
          as: 'images',
          attributes: [],
          through: { attributes: [] },
        },
      ],
      attributes: [
        'id',
        'name',
        [Tag.sequelize.fn('COUNT', Tag.sequelize.col('images.id')), 'count'],
      ],
      group: ['Tag.id'],
      order: [[Tag.sequelize.literal('count'), 'DESC']],
      limit: 20,
    });

    // MIME type distribution
    const mimeTypes = await Image.findAll({
      attributes: [
        'mimeType',
        [Image.sequelize.fn('COUNT', Image.sequelize.col('id')), 'count'],
      ],
      group: ['mimeType'],
      order: [[Image.sequelize.literal('count'), 'DESC']],
    });

    return res.json({
      data: {
        tags: topTags.map((t) => ({
          id: t.id,
          name: t.name,
          count: parseInt(t.dataValues.count || 0),
        })),
        mimeTypes: mimeTypes.map((m) => ({
          mimeType: m.mimeType,
          count: parseInt(m.dataValues.count || 0),
        })),
      },
    });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;