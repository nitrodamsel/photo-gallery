'use strict';

const express = require('express');
const router = express.Router();
const { Tag, Image, ImageTag } = require('../../../models');
const { Op } = require('sequelize');

/**
 * GET /api/v1/tags
 * List all tags with optional search
 */
router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 50));
    const offset = (page - 1) * limit;

    const where = {};
    if (req.query.search) {
      where.name = { [Op.like]: `%${req.query.search}%` };
    }

    const { count, rows } = await Tag.findAndCountAll({
      where,
      limit,
      offset,
      order: [['name', 'ASC']],
    });

    const totalPages = Math.ceil(count / limit);

    res.json({
      data: rows,
      pagination: {
        page,
        limit,
        total: count,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/tags
 * Create a new tag
 */
router.post('/', async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Tag name is required' },
      });
    }

    const normalizedName = name.toLowerCase().trim();
    const [tag, created] = await Tag.findOrCreate({
      where: { name: normalizedName },
      defaults: { name: normalizedName },
    });

    res.status(created ? 201 : 200).json({ data: tag });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/tags/:id
 * Get a single tag with image count
 */
router.get('/:id', async (req, res, next) => {
  try {
    const tag = await Tag.findByPk(req.params.id, {
      include: [
        {
          model: Image,
          as: 'images',
          through: { attributes: [] },
          attributes: ['id'],
        },
      ],
    });

    if (!tag) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Tag not found' },
      });
    }

    const result = tag.toJSON();
    result.imageCount = result.images ? result.images.length : 0;
    delete result.images;

    res.json({ data: result });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/v1/tags/:id
 * Rename a tag
 */
router.patch('/:id', async (req, res, next) => {
  try {
    const tag = await Tag.findByPk(req.params.id);

    if (!tag) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Tag not found' },
      });
    }

    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Tag name is required' },
      });
    }

    const normalizedName = name.toLowerCase().trim();

    // Check for duplicate
    const existing = await Tag.findOne({ where: { name: normalizedName } });
    if (existing && existing.id !== tag.id) {
      return res.status(409).json({
        error: { code: 'CONFLICT', message: 'A tag with that name already exists' },
      });
    }

    await tag.update({ name: normalizedName });

    res.json({ data: tag });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/v1/tags/:id
 * Delete a tag
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const tag = await Tag.findByPk(req.params.id);

    if (!tag) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Tag not found' },
      });
    }

    await tag.destroy();

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;