'use strict';

const express = require('express');
const router = express.Router();
const { Image, Tag, sequelize } = require('../../../models');
const { Op } = require('sequelize');

/**
 * Helper to format image for API response
 */
function formatImage(image) {
  const data = image.toJSON ? image.toJSON() : image;
  return {
    id: data.id,
    filename: data.filename,
    originalName: data.originalName,
    mimeType: data.mimeType,
    fileSize: data.fileSize,
    width: data.width,
    height: data.height,
    title: data.title,
    description: data.description,
    cameraMake: data.cameraMake,
    cameraModel: data.cameraModel,
    takenAt: data.takenAt,
    latitude: data.latitude,
    longitude: data.longitude,
    tags: data.tags ? data.tags.map(t => ({ id: t.id, name: t.name, slug: t.slug })) : [],
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    urls: {
      original: `/uploads/${data.filename}`,
      thumbnail: `/thumbnails/${data.id}?size=300`,
    },
  };
}

/**
 * Build WHERE clause from query params
 */
function buildWhereClause(query) {
  const where = {};

  if (query.q) {
    where[Op.or] = [
      { title: { [Op.like]: `%${query.q}%` } },
      { description: { [Op.like]: `%${query.q}%` } },
      { originalName: { [Op.like]: `%${query.q}%` } },
      { cameraMake: { [Op.like]: `%${query.q}%` } },
      { cameraModel: { [Op.like]: `%${query.q}%` } },
    ];
  }

  if (query.cameraMake) {
    where.cameraMake = { [Op.like]: `%${query.cameraMake}%` };
  }

  if (query.cameraModel) {
    where.cameraModel = { [Op.like]: `%${query.cameraModel}%` };
  }

  if (query.dateFrom) {
    where.takenAt = where.takenAt || {};
    where.takenAt[Op.gte] = new Date(query.dateFrom);
  }

  if (query.dateTo) {
    where.takenAt = where.takenAt || {};
    where.takenAt[Op.lte] = new Date(query.dateTo);
  }

  if (query.minWidth) {
    where.width = where.width || {};
    where.width[Op.gte] = parseInt(query.minWidth);
  }

  if (query.maxWidth) {
    where.width = where.width || {};
    where.width[Op.lte] = parseInt(query.maxWidth);
  }

  if (query.minHeight) {
    where.height = where.height || {};
    where.height[Op.gte] = parseInt(query.minHeight);
  }

  if (query.maxHeight) {
    where.height = where.height || {};
    where.height[Op.lte] = parseInt(query.maxHeight);
  }

  return where;
}

/**
 * GET /api/v1/search
 * Search images with full filter support
 */
router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const sortBy = req.query.sortBy || 'createdAt';
    const sortDir = (req.query.sortDir || 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const allowedSortFields = ['createdAt', 'updatedAt', 'takenAt', 'fileSize', 'title', 'originalName'];
    const orderField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';

    const where = buildWhereClause(req.query);

    // Handle tag filtering
    const tagInclude = {
      model: Tag,
      as: 'tags',
      through: { attributes: [] },
      required: false,
    };

    if (req.query.tags) {
      const tagSlugs = req.query.tags.split(',').map(t => t.trim()).filter(Boolean);
      if (tagSlugs.length > 0) {
        tagInclude.where = { slug: { [Op.in]: tagSlugs } };
        tagInclude.required = true;
      }
    }

    const { count, rows } = await Image.findAndCountAll({
      where,
      include: [tagInclude],
      order: [[orderField, sortDir]],
      limit,
      offset,
      distinct: true,
    });

    const totalPages = Math.ceil(count / limit);

    res.json({
      data: rows.map(formatImage),
      pagination: {
        page,
        limit,
        total: count,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
      query: {
        q: req.query.q || null,
        tags: req.query.tags || null,
        cameraMake: req.query.cameraMake || null,
        cameraModel: req.query.cameraModel || null,
        dateFrom: req.query.dateFrom || null,
        dateTo: req.query.dateTo || null,
        sortBy: orderField,
        sortDir,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/search/facets
 * Get facet data for filtering
 */
router.get('/facets', async (req, res, next) => {
  try {
    // Camera makes
    const cameraMakes = await Image.findAll({
      attributes: [
        'cameraMake',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      ],
      where: { cameraMake: { [Op.ne]: null } },
      group: ['cameraMake'],
      order: [[sequelize.literal('count'), 'DESC']],
      limit: 20,
      raw: true,
    });

    // Camera models
    const cameraModels = await Image.findAll({
      attributes: [
        'cameraModel',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      ],
      where: { cameraModel: { [Op.ne]: null } },
      group: ['cameraModel'],
      order: [[sequelize.literal('count'), 'DESC']],
      limit: 20,
      raw: true,
    });

    // Top tags
    const topTags = await Tag.findAll({
      include: [{ model: Image, as: 'images', attributes: [], through: { attributes: [] } }],
      attributes: [
        'id',
        'name',
        'slug',
        [sequelize.fn('COUNT', sequelize.col('images.id')), 'count'],
      ],
      group: ['Tag.id'],
      order: [[sequelize.literal('count'), 'DESC']],
      limit: 30,
      raw: true,
      subQuery: false,
    });

    // Date range
    const dateRange = await Image.findOne({
      attributes: [
        [sequelize.fn('MIN', sequelize.col('takenAt')), 'earliest'],
        [sequelize.fn('MAX', sequelize.col('takenAt')), 'latest'],
      ],
      where: { takenAt: { [Op.ne]: null } },
      raw: true,
    });

    res.json({
      data: {
        cameraMakes: cameraMakes.map(r => ({ value: r.cameraMake, count: parseInt(r.count) })),
        cameraModels: cameraModels.map(r => ({ value: r.cameraModel, count: parseInt(r.count) })),
        tags: topTags.map(r => ({ id: r.id, name: r.name, slug: r.slug, count: parseInt(r.count) })),
        dateRange: dateRange ? { earliest: dateRange.earliest, latest: dateRange.latest } : null,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;