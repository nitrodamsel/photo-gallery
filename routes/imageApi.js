const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { Image, Tag, ImageTag } = require('../models');
const imageService = require('../services/imageService');
const thumbnailService = require('../services/thumbnailService');
const bulkService = require('../services/bulkService');

// PATCH /api/images/:id — update description, manualExif, rotation
router.patch('/:id', async (req, res) => {
  try {
    const image = await Image.findByPk(req.params.id);
    if (!image) return res.status(404).json({ error: 'Image not found' });

    const { description, manualExif, rotation } = req.body;
    const updates = {};
    let regenerateThumbs = false;

    if (description !== undefined) {
      updates.description = description;
    }

    if (manualExif !== undefined) {
      updates.manualExif = typeof manualExif === 'string' ? manualExif : JSON.stringify(manualExif);
    }

    if (rotation !== undefined) {
      const validRotations = [0, 90, 180, 270];
      const newRotation = parseInt(rotation, 10);
      if (!validRotations.includes(newRotation)) {
        return res.status(400).json({ error: 'Invalid rotation value. Must be 0, 90, 180, or 270.' });
      }
      if (image.rotation !== newRotation) {
        updates.rotation = newRotation;
        regenerateThumbs = true;
      }
    }

    if (req.body.flipH !== undefined) {
      updates.flipH = req.body.flipH;
      regenerateThumbs = true;
    }

    await image.update(updates);

    if (regenerateThumbs) {
      try {
        await thumbnailService.regenerateThumbnails(image);
      } catch (thumbErr) {
        console.error('Thumbnail regeneration error:', thumbErr);
      }
    }

    const updatedImage = await Image.findByPk(image.id, {
      include: [{ model: Tag, through: { attributes: [] } }]
    });

    res.json({
      success: true,
      image: updatedImage
    });
  } catch (err) {
    console.error('Error updating image:', err);
    res.status(500).json({ error: 'Failed to update image', details: err.message });
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
    console.error('Error deleting image:', err);
    res.status(500).json({ error: 'Failed to delete image', details: err.message });
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
        if (!payload || (!payload.tagId && !payload.tagName)) {
          return res.status(400).json({ error: 'payload.tagId or payload.tagName is required for removeTag action' });
        }
        result = await bulkService.bulkUntag(imageIds, payload.tagId, payload.tagName);
        break;
      }
      case 'delete': {
        result = await bulkService.bulkDelete(imageIds);
        break;
      }
      default:
        return res.status(400).json({ error: `Unknown action: ${action}` });
    }

    res.json({ success: true, result });
  } catch (err) {
    console.error('Error in bulk operation:', err);
    res.status(500).json({ error: 'Bulk operation failed', details: err.message });
  }
});

// POST /api/images/:id/regenerate-thumbnails — admin action
router.post('/:id/regenerate-thumbnails', async (req, res) => {
  try {
    const image = await Image.findByPk(req.params.id);
    if (!image) return res.status(404).json({ error: 'Image not found' });

    await thumbnailService.regenerateThumbnails(image);

    res.json({ success: true, message: 'Thumbnails regenerated successfully' });
  } catch (err) {
    console.error('Error regenerating thumbnails:', err);
    res.status(500).json({ error: 'Failed to regenerate thumbnails', details: err.message });
  }
});

module.exports = router;