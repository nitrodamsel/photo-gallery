'use strict';

const express = require('express');
const router = express.Router();
const { Tag, Image } = require('../../../models');
const { Op } = require('sequelize');

/**
 * Helper to format tag for API response
 */
function formatTag(tag) {
  const data = tag.toJSON ? tag.toJSON() : tag;
  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    imageCount: data.imageCount !== undefined ? data.imageCount : (data.images ? data.images.length : undefined),
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

/**
 * Slugify a tag name
 */
function slugify(name) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/**
 * GET /api/v1/tags
 * List all tags
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
      include: [{ model: Image, as: 'images', attributes: ['id'], through: { attributes: [] } }],
      order: [['name', 'ASC']],
      limit,
      offset,
      distinct: true,
    });

    const totalPages = Math.ceil(count / limit);

    res.json({
      data: rows.map(tag => ({
        ...formatTag(tag),
        imageCount: tag.images ? tag.images.length : 0,
      })),
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
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        error: { code: 'BAD_REQUEST', message: 'Tag name is required' },
      });
    }

    const trimmedName = name.trim();
    const slug = slugify(trimmedName);

    // Check for duplicate
    const existing = await Tag.findOne({ where: { slug } });
    if (existing) {
      return res.status(409).json({
        error: { code: 'CONFLICT', message: `Tag with slug '${slug}' already exists` },
      });
    }

    const tag = await Tag.create({ name: trimmedName, slug });
    res.status(201).json({ data: formatTag(tag) });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/tags/:id
 * Get a single tag by ID
 */
router.get('/:id', async (req, res, next) => {
  try {
    const tag = await Tag.findByPk(req.params.id, {
      include: [{ model: Image, as: 'images', attributes: ['id'], through: { attributes: [] } }],
    });

    if (!tag) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: `Tag with id '${req.params.id}' not found` },
      });
    }

    res.json({ data: { ...formatTag(tag), imageCount: tag.images ? tag.images.length : 0 } });
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
        error: { code: 'NOT_FOUND', message: `Tag with id '${req.params.id}' not found` },
      });
    }

    const { name } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        error: { code: 'BAD_REQUEST', message: 'Tag name is required' },
      });
    }

    const trimmedName = name.trim();
    const newSlug = slugify(trimmedName);

    // Check for conflict with another tag
    const existing = await Tag.findOne({ where: { slug: newSlug, id: { [Op.ne]: tag.id } } });
    if (existing) {
      return res.status(409).json({
        error: { code: 'CONFLICT', message: `Another tag with slug '${newSlug}' already exists` },
      });
    }

    await tag.update({ name: trimmedName, slug: newSlug });
    res.json({ data: formatTag(tag) });
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
        error: { code: 'NOT_FOUND', message: `Tag with id '${req.params.id}' not found` },
      });
    }

    await tag.destroy();
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;