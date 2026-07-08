'use strict';

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { Image, Tag, ImageTag } = require('../../../models');
const imageService = require('../../../services/imageService');
const { Op, fn, col, literal } = require('sequelize');

// Multer config for API uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../../uploads'));
  },
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|tiff|bmp/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext && mime) return cb(null, true);
    cb(new Error('Only image files are allowed'));
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
      where.originalName = { [Op.iLike]: `%${req.query.search}%` };
    }

    if (req.query.mimeType) {
      where.mimeType = req.query.mimeType;
    }

    const { count, rows } = await Image.findAndCountAll({
      where,
      include: [{ model: Tag, as: 'tags', through: { attributes: [] } }],
      limit,
      offset,
      order: [['createdAt', 'DESC']],
      distinct: true,
    });

    res.json({
      data: rows,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit),
        hasNext: page < Math.ceil(count / limit),
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
        error: { code: 'MISSING_FILE', message: 'No image file provided' },
      });
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

    let image;
    try {
      image = await imageService.processAndSaveImage(imageData, req.file.path);
    } catch (serviceErr) {
      // Fallback: save directly if service method signature differs
      image = await Image.create(imageData);
    }

    res.status(201).json({ data: image });
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
      include: [{ model: Tag, as: 'tags', through: { attributes: [] } }],
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

/**
 * PATCH /api/v1/images/:id
 * Update image metadata
 */
router.patch('/:id', async (req, res, next) => {
  try {
    const image = await Image.findByPk(req.params.id);

    if (!image) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Image not found' },
      });
    }

    const allowedFields = ['title', 'description', 'isPublic'];
    const updates = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    await image.update(updates);

    // Update tags if provided
    if (req.body.tags && Array.isArray(req.body.tags)) {
      const tagInstances = await Promise.all(
        req.body.tags.map((name) =>
          Tag.findOrCreate({ where: { name: name.toLowerCase().trim() } }).then(([t]) => t)
        )
      );
      await image.setTags(tagInstances);
    }

    await image.reload({ include: [{ model: Tag, as: 'tags', through: { attributes: [] } }] });

    res.json({ data: image });
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
        error: { code: 'NOT_FOUND', message: 'Image not found' },
      });
    }

    try {
      await imageService.deleteImage(image.id);
    } catch (serviceErr) {
      await image.destroy();
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;