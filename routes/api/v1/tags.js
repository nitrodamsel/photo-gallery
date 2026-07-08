'use strict';

const express = require('express');
const router = express.Router();
const { Tag, Image, ImageTag } = require('../../../models');
const { Op } = require('sequelize');

/**
 * GET /api/v1/tags
 * List all tags with optional search and image count
 */
router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const offset = (page - 1) * limit;

    const where = {};
    if (req.query.search) {
      where.name = { [Op.iLike]: `%${req.query.search}%` };
    }

    const { count, rows } = await Tag.findAndCountAll({
      where,
      limit,
      offset,
      order: [['name', 'ASC']],
      include: [
        {
          model: Image,
          as: 'images',
          through: { attributes: [] },
          attributes: [],
        },
      ],
    });

    res.json({
      data: rows,
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
 * POST /api/v1/tags
 * Create a new tag
 */
router.post('/', async (req, res, next) => {
  try {
    const { name } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        error: {
          code: 'BAD_REQUEST',
          message: 'Tag name is required and must be a non-empty string',
        },
      });
    }

    const normalizedName = name.trim().toLowerCase();

    const existing = await Tag.findOne({ where: { name: normalizedName } });
    if (existing) {
      return res.status(409).json({
        error: {
          code: 'CONFLICT',
          message: `Tag "${normalizedName}" already exists`,
        },
        data: existing,
      });
    }

    const tag = await Tag.create({ name: normalizedName });
    res.status(201).json({ data: tag });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/tags/:id
 * Get a single tag by ID with its images
 */
router.get('/:id', async (req, res, next) => {
  try {
    const tag = await Tag.findByPk(req.params.id, {
      include: [
        {
          model: Image,
          as: 'images',
          through: { attributes: [] },
          limit: 20,
        },
      ],
    });

    if (!tag) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `Tag with ID ${req.params.id} not found`,
        },
      });
    }

    res.json({ data: tag });
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
        error: {
          code: 'NOT_FOUND',
          message: `Tag with ID ${req.params.id} not found`,
        },
      });
    }

    const { name } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        error: {
          code: 'BAD_REQUEST',
          message: 'New tag name is required and must be a non-empty string',
        },
      });
    }

    const normalizedName = name.trim().toLowerCase();

    const existing = await Tag.findOne({ where: { name: normalizedName } });
    if (existing && existing.id !== tag.id) {
      return res.status(409).json({
        error: {
          code: 'CONFLICT',
          message: `Tag "${normalizedName}" already exists`,
        },
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
 * Delete a tag (also removes it from all images)
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const tag = await Tag.findByPk(req.params.id);

    if (!tag) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `Tag with ID ${req.params.id} not found`,
        },
      });
    }

    // Remove all image-tag associations first
    await ImageTag.destroy({ where: { tagId: tag.id } });
    await tag.destroy();

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;