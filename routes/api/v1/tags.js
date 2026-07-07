'use strict';

const express = require('express');
const router = express.Router();
const { Tag, ImageTag, sequelize } = require('../../../models');
const { Op } = require('sequelize');

// GET /api/v1/tags — list all tags with image counts
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
      attributes: [
        'id',
        'name',
        'slug',
        'createdAt',
        [sequelize.fn('COUNT', sequelize.col('ImageTags.imageId')), 'imageCount'],
      ],
      include: [
        {
          model: ImageTag,
          attributes: [],
          required: false,
        },
      ],
      group: ['Tag.id'],
      order: [[sequelize.literal('imageCount'), 'DESC']],
      limit,
      offset,
      subQuery: false,
    });

    res.json({
      data: rows,
      pagination: {
        total: count.length || count,
        page,
        limit,
        pages: Math.ceil((count.length || count) / limit),
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/tags — create a new tag
router.post('/', async (req, res, next) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Tag name is required' },
      });
    }

    const slug = name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    const [tag, created] = await Tag.findOrCreate({
      where: { name: name.trim() },
      defaults: { name: name.trim(), slug },
    });

    res.status(created ? 201 : 200).json({ data: tag });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/tags/:id — get single tag
router.get('/:id', async (req, res, next) => {
  try {
    const tag = await Tag.findByPk(req.params.id, {
      attributes: [
        'id',
        'name',
        'slug',
        'createdAt',
        [sequelize.fn('COUNT', sequelize.col('ImageTags.imageId')), 'imageCount'],
      ],
      include: [{ model: ImageTag, attributes: [], required: false }],
      group: ['Tag.id'],
    });

    if (!tag) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Tag not found' },
      });
    }

    res.json({ data: tag });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/tags/:id — rename a tag
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

    const slug = name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    await tag.update({ name: name.trim(), slug });

    res.json({ data: tag });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/v1/tags/:id — delete a tag
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