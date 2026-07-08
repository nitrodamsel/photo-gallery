'use strict';

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { Image, Tag, ImageTag } = require('../../../models');
const imageService = require('../../../services/imageService');
const { Op } = require('sequelize');

// Configure multer for API uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../../uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|gif|webp|tiff|heic)$/i;
    if (allowed.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

/**
 * GET /api/v1/images
 * List images with pagination and filtering
 */
router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const where = {};

    if (req.query.search) {
      where[Op.or] = [
        { originalName: { [Op.iLike]: `%${req.query.search}%` } },
        { description: { [Op.iLike]: `%${req.query.search}%` } },
      ];
    }

    if (req.query.cameraMake) {
      where.cameraMake = { [Op.iLike]: `%${req.query.cameraMake}%` };
    }

    const orderField = req.query.sortBy || 'createdAt';
    const orderDir = req.query.sortDir === 'asc' ? 'ASC' : 'DESC';

    const { count, rows } = await Image.findAndCountAll({
      where,
      limit,
      offset,
      order: [[orderField, orderDir]],
      include: [
        {
          model: Tag,
          as: 'tags',
          through: { attributes: [] },
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
 * POST /api/v1/images
 * Upload a new image
 */
router.post('/', upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: {
          code: 'BAD_REQUEST',
          message: 'No image file provided. Use multipart/form-data with field name "image".',
        },
      });
    }

    const imageData = await imageService.processUploadedImage(req.file, req.body);
    res.status(201).json({ data: imageData });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/images/:id
 * Get a single image by ID
 */
router.get('/:id', async (req, res, next) => {
  try {
    const image = await Image.findByPk(req.params.id, {
      include: [
        {
          model: Tag,
          as: 'tags',
          through: { attributes: [] },
        },
      ],
    });

    if (!image) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `Image with ID ${req.params.id} not found`,
        },
      });
    }

    res.json({ data: image });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/v1/images/:id
 * Update image metadata
 */
router.patch('/:id', async (req, res, next) => {
  try {
    const image = await Image.findByPk(req.params.id);

    if (!image) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `Image with ID ${req.params.id} not found`,
        },
      });
    }

    const allowedFields = ['title', 'description', 'altText', 'isPublic'];
    const updates = {};

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    await image.update(updates);

    // Handle tag updates if provided
    if (req.body.tags !== undefined) {
      if (Array.isArray(req.body.tags)) {
        const tagNames = req.body.tags.map((t) => String(t).trim().toLowerCase()).filter(Boolean);
        const tagInstances = await Promise.all(
          tagNames.map((name) => Tag.findOrCreate({ where: { name }, defaults: { name } }))
        );
        await image.setTags(tagInstances.map(([tag]) => tag));
      }
    }

    const updatedImage = await Image.findByPk(image.id, {
      include: [{ model: Tag, as: 'tags', through: { attributes: [] } }],
    });

    res.json({ data: updatedImage });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/v1/images/:id
 * Delete an image
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const image = await Image.findByPk(req.params.id);

    if (!image) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `Image with ID ${req.params.id} not found`,
        },
      });
    }

    await imageService.deleteImage(image);

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;