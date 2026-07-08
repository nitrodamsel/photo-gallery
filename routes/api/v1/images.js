'use strict';

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;
const { Image, Tag, ImageTag } = require('../../../models');
const { Op, fn, col, literal } = require('sequelize');
const uploadMiddleware = require('../../../middleware/upload');
const imageService = require('../../../services/imageService');

// GET /api/v1/images - List images with pagination
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const where = {};

    if (req.query.search) {
      where.originalName = { [Op.like]: `%${req.query.search}%` };
    }

    if (req.query.mimeType) {
      where.mimeType = req.query.mimeType;
    }

    const { count, rows } = await Image.findAndCountAll({
      where,
      include: [
        {
          model: Tag,
          through: { attributes: [] },
          attributes: ['id', 'name', 'slug'],
        },
      ],
      limit,
      offset,
      order: [['createdAt', 'DESC']],
      distinct: true,
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
    console.error('GET /api/v1/images error:', err);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch images.' },
    });
  }
});

// POST /api/v1/images - Upload a new image
router.post('/', uploadMiddleware.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'No image file provided.' },
      });
    }

    const imageData = await imageService.processUpload(req.file, req.body);
    return res.status(201).json({ data: imageData });
  } catch (err) {
    console.error('POST /api/v1/images error:', err);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to upload image.' },
    });
  }
});

// GET /api/v1/images/:id - Get single image
router.get('/:id', async (req, res) => {
  try {
    const image = await Image.findByPk(req.params.id, {
      include: [
        {
          model: Tag,
          through: { attributes: [] },
          attributes: ['id', 'name', 'slug'],
        },
      ],
    });

    if (!image) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Image not found.' },
      });
    }

    return res.json({ data: image });
  } catch (err) {
    console.error('GET /api/v1/images/:id error:', err);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch image.' },
    });
  }
});

// PATCH /api/v1/images/:id - Update image metadata
router.patch('/:id', async (req, res) => {
  try {
    const image = await Image.findByPk(req.params.id);

    if (!image) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Image not found.' },
      });
    }

    const allowedFields = ['title', 'description', 'altText', 'tags'];
    const updateData = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    // Handle tags separately
    let tagIds = null;
    if (updateData.tags !== undefined) {
      tagIds = updateData.tags;
      delete updateData.tags;
    }

    await image.update(updateData);

    // Update tags if provided
    if (tagIds !== null && Array.isArray(tagIds)) {
      const tags = await Tag.findAll({ where: { id: tagIds } });
      await image.setTags(tags);
    }

    await image.reload({
      include: [
        {
          model: Tag,
          through: { attributes: [] },
          attributes: ['id', 'name', 'slug'],
        },
      ],
    });

    return res.json({ data: image });
  } catch (err) {
    console.error('PATCH /api/v1/images/:id error:', err);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to update image.' },
    });
  }
});

// DELETE /api/v1/images/:id - Delete image
router.delete('/:id', async (req, res) => {
  try {
    const image = await Image.findByPk(req.params.id);

    if (!image) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Image not found.' },
      });
    }

    // Delete physical file
    if (image.filePath) {
      try {
        await fs.unlink(image.filePath);
      } catch (fileErr) {
        console.warn('Could not delete image file:', fileErr.message);
      }
    }

    await image.destroy();

    return res.json({ data: { message: 'Image deleted successfully.' } });
  } catch (err) {
    console.error('DELETE /api/v1/images/:id error:', err);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to delete image.' },
    });
  }
});

module.exports = router;