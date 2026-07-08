'use strict';

const express = require('express');
const router = express.Router();
const { Image, Tag, ImageTag } = require('../../../models');
const imageService = require('../../../services/imageService');
const { Op } = require('sequelize');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../../uploads'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|tiff|bmp/i;
    if (allowed.test(path.extname(file.originalname))) {
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
        { originalName: { [Op.like]: `%${req.query.search}%` } },
        { title: { [Op.like]: `%${req.query.search}%` } },
        { description: { [Op.like]: `%${req.query.search}%` } },
      ];
    }

    const order = [];
    const sortField = req.query.sort || 'createdAt';
    const sortDir = req.query.dir === 'asc' ? 'ASC' : 'DESC';
    const allowedSort = ['createdAt', 'originalName', 'fileSize', 'title'];
    if (allowedSort.includes(sortField)) {
      order.push([sortField, sortDir]);
    } else {
      order.push(['createdAt', 'DESC']);
    }

    const { count, rows } = await Image.findAndCountAll({
      where,
      include: [{ model: Tag, as: 'tags', through: { attributes: [] } }],
      limit,
      offset,
      order,
      distinct: true,
    });

    const totalPages = Math.ceil(count / limit);

    res.json({
      data: rows,
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
 * POST /api/v1/images
 * Upload a new image
 */
router.post('/', upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: { code: 'NO_FILE', message: 'No image file provided' },
      });
    }

    const imageData = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      path: req.file.path,
      title: req.body.title || null,
      description: req.body.description || null,
    };

    const image = await imageService.createImage(imageData, req.file);

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
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    await image.update(updates);

    // Handle tags if provided
    if (Array.isArray(req.body.tags)) {
      const tagInstances = await Promise.all(
        req.body.tags.map((name) =>
          Tag.findOrCreate({ where: { name: name.toLowerCase().trim() } }).then(([t]) => t)
        )
      );
      await image.setTags(tagInstances);
    }

    const updated = await Image.findByPk(image.id, {
      include: [{ model: Tag, as: 'tags', through: { attributes: [] } }],
    });

    res.json({ data: updated });
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

    await imageService.deleteImage(image);

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;