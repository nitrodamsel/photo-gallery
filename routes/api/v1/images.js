'use strict';

const express = require('express');
const router = express.Router();
const { Image, Tag, ImageTag } = require('../../../models');
const imageService = require('../../../services/imageService');
const { Op } = require('sequelize');
const path = require('path');
const fs = require('fs').promises;

/**
 * Helper to format image for API response
 */
function formatImage(image) {
  const data = image.toJSON ? image.toJSON() : image;
  return {
    id: data.id,
    filename: data.filename,
    originalName: data.originalName,
    mimeType: data.mimeType,
    fileSize: data.fileSize,
    width: data.width,
    height: data.height,
    title: data.title,
    description: data.description,
    cameraMake: data.cameraMake,
    cameraModel: data.cameraModel,
    takenAt: data.takenAt,
    latitude: data.latitude,
    longitude: data.longitude,
    tags: data.tags ? data.tags.map(t => ({ id: t.id, name: t.name, slug: t.slug })) : [],
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    urls: {
      original: `/uploads/${data.filename}`,
      thumbnail: `/thumbnails/${data.id}?size=300`,
    },
  };
}

/**
 * GET /api/v1/images
 * List images with pagination
 */
router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const where = {};
    if (req.query.search) {
      where[Op.or] = [
        { title: { [Op.like]: `%${req.query.search}%` } },
        { description: { [Op.like]: `%${req.query.search}%` } },
        { originalName: { [Op.like]: `%${req.query.search}%` } },
      ];
    }

    const { count, rows } = await Image.findAndCountAll({
      where,
      include: [{ model: Tag, as: 'tags', through: { attributes: [] } }],
      order: [['createdAt', 'DESC']],
      limit,
      offset,
      distinct: true,
    });

    const totalPages = Math.ceil(count / limit);

    res.json({
      data: rows.map(formatImage),
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
        error: { code: 'NOT_FOUND', message: `Image with id '${req.params.id}' not found` },
      });
    }

    res.json({ data: formatImage(image) });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/images
 * Upload a new image (multipart/form-data)
 */
router.post('/', async (req, res, next) => {
  try {
    // This endpoint requires multipart upload middleware
    // For API uploads, we delegate to the upload middleware set up in app
    return res.status(501).json({
      error: {
        code: 'NOT_IMPLEMENTED',
        message: 'Image upload via API requires multipart form. Use POST /upload endpoint or refer to the API documentation.',
      },
    });
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
    const image = await Image.findByPk(req.params.id, {
      include: [{ model: Tag, as: 'tags', through: { attributes: [] } }],
    });

    if (!image) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: `Image with id '${req.params.id}' not found` },
      });
    }

    const allowedFields = ['title', 'description'];
    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        error: {
          code: 'BAD_REQUEST',
          message: 'No valid fields provided for update. Allowed fields: title, description',
        },
      });
    }

    await image.update(updates);
    await image.reload({ include: [{ model: Tag, as: 'tags', through: { attributes: [] } }] });

    res.json({ data: formatImage(image) });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/v1/images/:id
 * Delete an image and its file
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const image = await Image.findByPk(req.params.id);

    if (!image) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: `Image with id '${req.params.id}' not found` },
      });
    }

    // Delete file from disk
    try {
      const filePath = path.join(__dirname, '../../../uploads', image.filename);
      await fs.unlink(filePath);
    } catch (fileErr) {
      console.warn(`Could not delete file for image ${image.id}:`, fileErr.message);
    }

    // Delete image record (cascades to ImageTag)
    await image.destroy();

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;