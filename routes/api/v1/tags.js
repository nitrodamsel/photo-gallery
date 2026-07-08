'use strict';

const express = require('express');
const router = express.Router();
const { Tag, Image, ImageTag } = require('../../../models');
const { Op } = require('sequelize');

function apiError(res, status, code, message) {
  return res.status(status).json({ error: { code, message } });
}

/**
 * GET /api/v1/tags
 * List all tags
 */
router.get('/', async (req, res, next) => {
  try {
    const tags = await Tag.findAll({
      order: [['name', 'ASC']],
      include: [
        {
          model: Image,
          as: 'images',
          attributes: [],
          through: { attributes: [] },
        },
      ],
      attributes: {
        include: [
          [
            Tag.sequelize.fn('COUNT', Tag.sequelize.col('images.id')),
            'imageCount',
          ],
        ],
      },
      group: ['Tag.id'],
    });
    return res.json({ data: tags });
  } catch (err) {
    return next(err);
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
      return apiError(res, 400, 'VALIDATION_ERROR', 'Tag name is required');
    }

    const [tag, created] = await Tag.findOrCreate({
      where: { name: name.trim().toLowerCase() },
      defaults: { name: name.trim().toLowerCase() },
    });

    return res.status(created ? 201 : 200).json({ data: tag });
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /api/v1/tags/:id
 * Get a single tag with its images
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
    if (!tag) return apiError(res, 404, 'NOT_FOUND', 'Tag not found');
    return res.json({ data: tag });
  } catch (err) {
    return next(err);
  }
});

/**
 * PATCH /api/v1/tags/:id
 * Rename a tag
 */
router.patch('/:id', async (req, res, next) => {
  try {
    const tag = await Tag.findByPk(req.params.id);
    if (!tag) return apiError(res, 404, 'NOT_FOUND', 'Tag not found');

    const { name } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return apiError(res, 400, 'VALIDATION_ERROR', 'Tag name is required');
    }

    await tag.update({ name: name.trim().toLowerCase() });
    return res.json({ data: tag });
  } catch (err) {
    return next(err);
  }
});

/**
 * DELETE /api/v1/tags/:id
 * Delete a tag
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const tag = await Tag.findByPk(req.params.id);
    if (!tag) return apiError(res, 404, 'NOT_FOUND', 'Tag not found');

    await ImageTag.destroy({ where: { tagId: tag.id } });
    await tag.destroy();

    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
});

module.exports = router;