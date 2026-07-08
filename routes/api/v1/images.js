'use strict';

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { Image, Tag, ImageTag } = require('../../../models');
const imageService = require('../../../services/imageService');
const { Op } = require('sequelize');

// Helper: standard error response
function apiError(res, status, code, message) {
  return res.status(status).json({ error: { code, message } });
}

// Helper: paginate
function getPagination(query) {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

/**
 * GET /api/v1/images
 * List images with pagination
 */
router.get('/', async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req.query);

    const where = {};
    if (req.query.search) {
      where.originalName = { [Op.iLike]: `%${req.query.search}%` };
    }

    const { count, rows } = await Image.findAndCountAll({
      where,
      include: [{ model: Tag, as: 'tags', through: { attributes: [] } }],
      order: [['createdAt', 'DESC']],
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
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /api/v1/images/:id
 * Get single image
 */
router.get('/:id', async (req, res, next) => {
  try {
    const image = await Image.findByPk(req.params.id, {
      include: [{ model: Tag, as: 'tags', through: { attributes: [] } }],
    });
    if (!image) return apiError(res, 404, 'NOT_FOUND', 'Image not found');
    return res.json({ data: image });
  } catch (err) {
    return next(err);
  }
});

/**
 * PATCH /api/v1/images/:id
 * Update image metadata
 */
router.patch('/:id', async (req, res, next) => {
  try {
    const image = await Image.findByPk(req.params.id);
    if (!image) return apiError(res, 404, 'NOT_FOUND', 'Image not found');

    const allowedFields = ['title', 'description', 'altText', 'isPublic'];
    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    await image.update(updates);

    const updated = await Image.findByPk(image.id, {
      include: [{ model: Tag, as: 'tags', through: { attributes: [] } }],
    });

    return res.json({ data: updated });
  } catch (err) {
    return next(err);
  }
});

/**
 * DELETE /api/v1/images/:id
 * Delete an image
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const image = await Image.findByPk(req.params.id);
    if (!image) return apiError(res, 404, 'NOT_FOUND', 'Image not found');

    await imageService.deleteImage(image.id);

    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
});

module.exports = router;