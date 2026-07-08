'use strict';

const express = require('express');
const router = express.Router();
const { Tag, Image, ImageTag } = require('../../../models');
const { Op } = require('sequelize');
const slugify = require('slugify');

// GET /api/v1/tags - List all tags
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
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

    return res.json({
      data: rows,
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
    console.error('GET /api/v1/tags error:', err);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch tags.' },
    });
  }
});

// POST /api/v1/tags - Create a new tag
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Tag name is required.' },
      });
    }

    const trimmedName = name.trim();
    const slug = slugify(trimmedName, { lower: true, strict: true });

    const existing = await Tag.findOne({ where: { slug } });
    if (existing) {
      return res.status(409).json({
        error: { code: 'CONFLICT', message: 'A tag with this name already exists.' },
      });
    }

    const tag = await Tag.create({ name: trimmedName, slug });

    return res.status(201).json({ data: tag });
  } catch (err) {
    console.error('POST /api/v1/tags error:', err);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to create tag.' },
    });
  }
});

// GET /api/v1/tags/:id - Get a single tag
router.get('/:id', async (req, res) => {
  try {
    const tag = await Tag.findByPk(req.params.id);

    if (!tag) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Tag not found.' },
      });
    }

    return res.json({ data: tag });
  } catch (err) {
    console.error('GET /api/v1/tags/:id error:', err);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch tag.' },
    });
  }
});

// PATCH /api/v1/tags/:id - Rename a tag
router.patch('/:id', async (req, res) => {
  try {
    const tag = await Tag.findByPk(req.params.id);

    if (!tag) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Tag not found.' },
      });
    }

    const { name } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Tag name is required.' },
      });
    }

    const trimmedName = name.trim();
    const slug = slugify(trimmedName, { lower: true, strict: true });

    const existing = await Tag.findOne({
      where: { slug, id: { [Op.ne]: tag.id } },
    });
    if (existing) {
      return res.status(409).json({
        error: { code: 'CONFLICT', message: 'A tag with this name already exists.' },
      });
    }

    await tag.update({ name: trimmedName, slug });

    return res.json({ data: tag });
  } catch (err) {
    console.error('PATCH /api/v1/tags/:id error:', err);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to update tag.' },
    });
  }
});

// DELETE /api/v1/tags/:id - Delete a tag
router.delete('/:id', async (req, res) => {
  try {
    const tag = await Tag.findByPk(req.params.id);

    if (!tag) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Tag not found.' },
      });
    }

    await tag.destroy();

    return res.json({ data: { message: 'Tag deleted successfully.' } });
  } catch (err) {
    console.error('DELETE /api/v1/tags/:id error:', err);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to delete tag.' },
    });
  }
});

module.exports = router;