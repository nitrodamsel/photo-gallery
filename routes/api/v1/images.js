'use strict';

const express = require('express');
const router = express.Router();
const { Image, Tag, ImageTag } = require('../../../models');
const { Op } = require('sequelize');
const path = require('path');
const fs = require('fs').promises;
const multer = require('multer');
const upload = require('../../../middleware/upload');

// Helper: standard error response
function apiError(res, status, code, message) {
  return res.status(status).json({ error: { code, message } });
}

// Helper: build pagination meta
function paginationMeta(page, limit, total) {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    hasNext: page * limit < total,
    hasPrev: page > 1,
  };
}

// GET /api/v1/images — list images (paginated)
router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const where = {};
    if (req.query.search) {
      where.originalName = { [Op.like]: `%${req.query.search}%` };
    }

    const { count, rows } = await Image.findAndCountAll({
      where,
      include: [{ model: Tag, as: 'tags', through: { attributes: [] } }],
      limit,
      offset,
      order: [['createdAt', 'DESC']],
    });

    return res.json({
      data: rows,
      pagination: paginationMeta(page, limit, count),
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/images — upload a new image
router.post('/', upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) {
      return apiError(res, 400, 'MISSING_FILE', 'No image file provided.');
    }

    const imageData = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      filePath: req.file.path,
      title: req.body.title || req.file.originalname,
      description: req.body.description || null,
    };

    const image = await Image.create(imageData);

    // Handle tags
    if (req.body.tags) {
      const tagNames = Array.isArray(req.body.tags)
        ? req.body.tags
        : req.body.tags.split(',').map((t) => t.trim()).filter(Boolean);

      const tagInstances = await Promise.all(
        tagNames.map((name) =>
          Tag.findOrCreate({ where: { name: name.toLowerCase() } }).then(([t]) => t)
        )
      );
      await image.setTags(tagInstances);
    }

    const result = await Image.findByPk(image.id, {
      include: [{ model: Tag, as: 'tags', through: { attributes: [] } }],
    });

    return res.status(201).json({ data: result });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/images/:id — get single image
router.get('/:id', async (req, res, next) => {
  try {
    const image = await Image.findByPk(req.params.id, {
      include: [{ model: Tag, as: 'tags', through: { attributes: [] } }],
    });

    if (!image) {
      return apiError(res, 404, 'NOT_FOUND', `Image with id '${req.params.id}' not found.`);
    }

    return res.json({ data: image });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/images/:id — update image metadata
router.patch('/:id', async (req, res, next) => {
  try {
    const image = await Image.findByPk(req.params.id);

    if (!image) {
      return apiError(res, 404, 'NOT_FOUND', `Image with id '${req.params.id}' not found.`);
    }

    const allowedFields = ['title', 'description', 'rating'];
    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    await image.update(updates);

    // Handle tags update
    if (req.body.tags !== undefined) {
      const tagNames = Array.isArray(req.body.tags)
        ? req.body.tags
        : req.body.tags.split(',').map((t) => t.trim()).filter(Boolean);

      const tagInstances = await Promise.all(
        tagNames.map((name) =>
          Tag.findOrCreate({ where: { name: name.toLowerCase() } }).then(([t]) => t)
        )
      );
      await image.setTags(tagInstances);
    }

    const result = await Image.findByPk(image.id, {
      include: [{ model: Tag, as: 'tags', through: { attributes: [] } }],
    });

    return res.json({ data: result });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/v1/images/:id — delete image
router.delete('/:id', async (req, res, next) => {
  try {
    const image = await Image.findByPk(req.params.id);

    if (!image) {
      return apiError(res, 404, 'NOT_FOUND', `Image with id '${req.params.id}' not found.`);
    }

    // Try to delete the file
    try {
      await fs.unlink(image.filePath);
    } catch (fileErr) {
      console.warn('Could not delete image file:', fileErr.message);
    }

    await image.destroy();

    return res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;