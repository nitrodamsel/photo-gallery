'use strict';

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { Image, Tag, ImageTag, sequelize } = require('../../../models');
const imageService = require('../../../services/imageService');
const { Op } = require('sequelize');

const upload = multer({
  dest: path.join(__dirname, '../../../uploads/'),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/tiff'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  },
});

// GET /api/v1/images — list paginated images
router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const where = {};
    if (req.query.search) {
      where[Op.or] = [
        { originalName: { [Op.like]: `%${req.query.search}%` } },
        { description: { [Op.like]: `%${req.query.search}%` } },
      ];
    }

    const { count, rows } = await Image.findAndCountAll({
      where,
      include: [{ model: Tag, through: { attributes: [] }, attributes: ['id', 'name', 'slug'] }],
      order: [['createdAt', 'DESC']],
      limit,
      offset,
      distinct: true,
    });

    res.json({
      data: rows,
      pagination: {
        total: count,
        page,
        limit,
        pages: Math.ceil(count / limit),
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/images — upload a new image
router.post('/', upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: { code: 'MISSING_FILE', message: 'No image file provided' },
      });
    }

    const image = await imageService.processUpload(req.file, {
      description: req.body.description || '',
      tags: req.body.tags ? req.body.tags.split(',').map((t) => t.trim()) : [],
    });

    res.status(201).json({ data: image });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/images/:id — get single image
router.get('/:id', async (req, res, next) => {
  try {
    const image = await Image.findByPk(req.params.id, {
      include: [{ model: Tag, through: { attributes: [] }, attributes: ['id', 'name', 'slug'] }],
    });

    if (!image) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Image not found' },
      });
    }

    res.json({ data: image });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/images/:id — update image metadata
router.patch('/:id', async (req, res, next) => {
  try {
    const image = await Image.findByPk(req.params.id);

    if (!image) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Image not found' },
      });
    }

    const allowedFields = ['description', 'title', 'rating'];
    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    await image.update(updates);

    // Handle tags if provided
    if (req.body.tags !== undefined) {
      const tagNames = Array.isArray(req.body.tags)
        ? req.body.tags
        : req.body.tags.split(',').map((t) => t.trim());

      const tagInstances = await Promise.all(
        tagNames.map((name) =>
          Tag.findOrCreate({ where: { name }, defaults: { name, slug: name.toLowerCase().replace(/\s+/g, '-') } })
        )
      );

      await image.setTags(tagInstances.map(([tag]) => tag));
    }

    const updated = await Image.findByPk(image.id, {
      include: [{ model: Tag, through: { attributes: [] }, attributes: ['id', 'name', 'slug'] }],
    });

    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/v1/images/:id — delete image
router.delete('/:id', async (req, res, next) => {
  try {
    const image = await Image.findByPk(req.params.id);

    if (!image) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Image not found' },
      });
    }

    await imageService.deleteImage(image.id);

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;