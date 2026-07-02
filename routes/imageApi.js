const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { Image, Tag, ImageTag } = require('../models');
const imageService = require('../services/imageService');
const thumbnailService = require('../services/thumbnailService');
const bulkService = require('../services/bulkService');
const { body, param, validationResult } = require('express-validator');

// PATCH /api/images/:id — update description, manualExif, rotation
router.patch('/:id', [
  param('id').isInt({ min: 1 }),
  body('description').optional().isString().trim(),
  body('rotation').optional().isIn([0, 90, 180, 270]),
  body('manualExif').optional().isObject(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Validation failed', details: errors.array() });
  }

  try {
    const image = await Image.findByPk(req.params.id);
    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }

    const { description, rotation, manualExif } = req.body;
    const updates = {};
    let regenerateThumbnails = false;

    if (description !== undefined) {
      updates.description = description;
    }

    if (rotation !== undefined) {
      const oldRotation = image.rotation || 0;
      updates.rotation = rotation;
      if (oldRotation !== rotation) {
        regenerateThumbnails = true;
      }
    }

    if (manualExif !== undefined) {
      const existingManualExif = image.manualExif || {};
      updates.manualExif = { ...existingManualExif, ...manualExif };
    }

    await image.update(updates);

    if (regenerateThumbnails) {
      try {
        await thumbnailService.generateThumbnails(image.filename, image.rotation || 0);
      } catch (thumbErr) {
        console.error('Thumbnail regeneration failed:', thumbErr);
      }
    }

    const updatedImage = await Image.findByPk(req.params.id, {
      include: [{ model: Tag, as: 'tags', through: { attributes: [] } }]
    });

    return res.json({ success: true, image: updatedImage });
  } catch (err) {
    console.error('Error updating image:', err);
    return res.status(500).json({ error: 'Failed to update image' });
  }
});

// DELETE /api/images/:id — delete files and DB record
router.delete('/:id', [
  param('id').isInt({ min: 1 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Validation failed', details: errors.array() });
  }

  try {
    const image = await Image.findByPk(req.params.id);
    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }

    await imageService.deleteImage(image.id);

    return res.json({ success: true, message: 'Image deleted successfully' });
  } catch (err) {
    console.error('Error deleting image:', err);
    return res.status(500).json({ error: 'Failed to delete image' });
  }
});

// POST /api/images/bulk — bulk operations
router.post('/bulk', [
  body('imageIds').isArray({ min: 1 }),
  body('imageIds.*').isInt({ min: 1 }),
  body('action').isIn(['tag', 'untag', 'delete']),
  body('payload').optional().isObject(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Validation failed', details: errors.array() });
  }

  try {
    const { imageIds, action, payload = {} } = req.body;
    let result;

    switch (action) {
      case 'tag':
        if (!payload.tagName) {
          return res.status(400).json({ error: 'tagName is required for tag action' });
        }
        result = await bulkService.bulkTag(imageIds, payload.tagName);
        break;

      case 'untag':
        if (!payload.tagId) {
          return res.status(400).json({ error: 'tagId is required for untag action' });
        }
        result = await bulkService.bulkUntag(imageIds, payload.tagId);
        break;

      case 'delete':
        result = await bulkService.bulkDelete(imageIds);
        break;

      default:
        return res.status(400).json({ error: 'Unknown action' });
    }

    return res.json({ success: true, result });
  } catch (err) {
    console.error('Bulk operation error:', err);
    return res.status(500).json({ error: 'Bulk operation failed' });
  }
});

// POST /api/images/:id/regenerate-thumbnails — admin action
router.post('/:id/regenerate-thumbnails', [
  param('id').isInt({ min: 1 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Validation failed', details: errors.array() });
  }

  try {
    const image = await Image.findByPk(req.params.id);
    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }

    await thumbnailService.generateThumbnails(image.filename, image.rotation || 0);

    return res.json({ success: true, message: 'Thumbnails regenerated successfully' });
  } catch (err) {
    console.error('Error regenerating thumbnails:', err);
    return res.status(500).json({ error: 'Failed to regenerate thumbnails' });
  }
});

module.exports = router;