'use strict';

const express = require('express');
const router = express.Router();
const { Tag, Image, ImageTag } = require('../../../models');
const { Op } = require('sequelize');

// Helper: standard error response
function apiError(res, status, code, message) {
  return res.status(status).json({ error: { code, message } });
}

// GET /api/v1/tags — list all tags
router.get('/', async (req, res, next) => {
  try {
    const tags = await Tag.findAll({
      attributes: [
        'id',
        'name',
        'createdAt',
      ],
      order: [['name', 'ASC']],
    });

    return res.json({ data: tags });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/tags — create a new tag
router.post('/', async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return apiError(res, 400, 'VALIDATION_ERROR', 'Tag name is required.');
    }

    const [tag, created] = await Tag.findOrCreate({
      where: { name: name.trim().toLowerCase() },
    });

    return res.status(created ? 201 : 200).json({ data: tag });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/tags/:id — get single tag with image count
router.get('/:id', async (req, res, next) => {
  try {
    const tag = await Tag.findByPk(req.params.id, {
      include: [
        {
          model: Image,
          as: 'images',
          through: { attributes: [] },
          attributes: ['id', 'title', 'filename', 'createdAt'],
        },
      ],
    });

    if (!tag) {
      return apiError(res, 404, 'NOT_FOUND', `Tag with id '${req.params.id}' not found.`);
    }

    return res.json({ data: tag });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/tags/:id — rename a tag
router.patch('/:id', async (req, res, next) => {
  try {
    const tag = await Tag.findByPk(req.params.id);

    if (!tag) {
      return apiError(res, 404, 'NOT_FOUND', `Tag with id '${req.params.id}' not found.`);
    }

    const { name } = req.body;
    if (!name || !name.trim()) {
      return apiError(res, 400, 'VALIDATION_ERROR', 'Tag name is required.');
    }

    // Check for duplicate
    const existing = await Tag.findOne({
      where: { name: name.trim().toLowerCase(), id: { [Op.ne]: tag.id } },
    });
    if (existing) {
      return apiError(res, 409, 'CONFLICT', `Tag with name '${name.trim().toLowerCase()}' already exists.`);
    }

    await tag.update({ name: name.trim().toLowerCase() });

    return res.json({ data: tag });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/v1/tags/:id — delete a tag
router.delete('/:id', async (req, res, next) => {
  try {
    const tag = await Tag.findByPk(req.params.id);

    if (!tag) {
      return apiError(res, 404, 'NOT_FOUND', `Tag with id '${req.params.id}' not found.`);
    }

    await tag.destroy();

    return res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;