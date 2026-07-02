const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const Image = require('../models/Image');
const imageService = require('../services/imageService');
const thumbnailService = require('../services/thumbnailService');
const bulkService = require('../services/bulkService');

// GET /api/images/:id
router.get('/:id', async (req, res) => {
  try {
    const image = await Image.findByPk(req.params.id);
    if (!image) return res.status(404).json({ error: 'Image not found' });
    res.json(image);
  } catch (err) {
    console.error('GET /api/images/:id error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/images/:id — update description, manualExif, rotation
router.patch('/:id', async (req, res) => {
  try {
    const image = await Image.findByPk(req.params.id);
    if (!image) return res.status(404).json({ error: 'Image not found' });

    const { description, manualExif, rotation } = req.body;
    const updates = {};

    if (description !== undefined) {
      updates.description = description;
    }

    if (manualExif !== undefined) {
      // Merge with existing manualExif
      const existing = image.manualExif || {};
      updates.manualExif = { ...existing, ...manualExif };
    }

    const rotationChanged = rotation !== undefined && rotation !== image.rotation;
    if (rotation !== undefined) {
      const validRotations = [0, 90, 180, 270];
      const rot = parseInt(rotation, 10);
      if (!validRotations.includes(rot)) {
        return res.status(400).json({ error: 'Invalid rotation value. Must be 0, 90, 180, or 270.' });
      }
      updates.rotation = rot;
    }

    await image.update(updates);

    // Regenerate thumbnails if rotation changed
    if (rotationChanged) {
      try {
        await thumbnailService.regenerateThumbnails(image.id);
      } catch (thumbErr) {
        console.error('Thumbnail regeneration failed:', thumbErr);
        // Non-fatal: continue and return updated image
      }
    }

    const updatedImage = await Image.findByPk(image.id);
    res.json(updatedImage);
  } catch (err) {
    console.error('PATCH /api/images/:id error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/images/:id
router.delete('/:id', async (req, res) => {
  try {
    const image = await Image.findByPk(req.params.id);
    if (!image) return res.status(404).json({ error: 'Image not found' });

    await imageService.deleteImage(image.id);
    res.json({ success: true, message: 'Image deleted successfully' });
  } catch (err) {
    console.error('DELETE /api/images/:id error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/images/bulk — bulk operations
router.post('/bulk', async (req, res) => {
  try {
    const { imageIds, action, payload } = req.body;

    if (!imageIds || !Array.isArray(imageIds) || imageIds.length === 0) {
      return res.status(400).json({ error: 'imageIds must be a non-empty array' });
    }

    if (!action) {
      return res.status(400).json({ error: 'action is required' });
    }

    let result;

    switch (action) {
      case 'addTag': {
        if (!payload || !payload.tagName) {
          return res.status(400).json({ error: 'payload.tagName is required for addTag action' });
        }
        result = await bulkService.bulkTag(imageIds, payload.tagName);
        break;
      }
      case 'removeTag': {
        if (!payload || !payload.tagId) {
          return res.status(400).json({ error: 'payload.tagId is required for removeTag action' });
        }
        result = await bulkService.bulkUntag(imageIds, payload.tagId);
        break;
      }
      case 'delete': {
        result = await bulkService.bulkDelete(imageIds);
        break;
      }
      default:
        return res.status(400).json({ error: `Unknown action: ${action}` });
    }

    res.json(result);
  } catch (err) {
    console.error('POST /api/images/bulk error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/images/:id/regenerate-thumbnails — admin action
router.post('/:id/regenerate-thumbnails', async (req, res) => {
  try {
    const image = await Image.findByPk(req.params.id);
    if (!image) return res.status(404).json({ error: 'Image not found' });

    await thumbnailService.regenerateThumbnails(image.id);
    res.json({ success: true, message: 'Thumbnails regenerated successfully' });
  } catch (err) {
    console.error('POST /api/images/:id/regenerate-thumbnails error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;