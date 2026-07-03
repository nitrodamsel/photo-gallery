const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const Image = require('../models/Image');
const imageService = require('../services/imageService');
const thumbnailService = require('../services/thumbnailService');
const bulkService = require('../services/bulkService');

// PATCH /api/images/:id — update description, manualExif, rotation
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { description, manualExif, rotation } = req.body;

    const image = await Image.findByPk(id);
    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }

    const previousRotation = image.rotation || 0;
    const updates = {};

    if (description !== undefined) {
      updates.description = description;
    }

    if (manualExif !== undefined) {
      updates.manualExif = typeof manualExif === 'string'
        ? manualExif
        : JSON.stringify(manualExif);
    }

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
    if (rotation !== undefined && parseInt(rotation, 10) !== previousRotation) {
      try {
        const uploadsDir = path.join(__dirname, '..', 'uploads');
        const originalPath = path.join(uploadsDir, image.filename);
        if (fs.existsSync(originalPath)) {
          await thumbnailService.generateThumbnails(originalPath, image.filename, {
            rotation: parseInt(rotation, 10)
          });
        }
      } catch (thumbErr) {
        console.error('Thumbnail regeneration failed:', thumbErr);
        // Non-fatal — continue and return updated image
      }
    }

    const updatedImage = await Image.findByPk(id);
    return res.json({ success: true, image: updatedImage });
  } catch (err) {
    console.error('PATCH /api/images/:id error:', err);
    return res.status(500).json({ error: 'Failed to update image', details: err.message });
  }
});

// DELETE /api/images/:id — delete files and DB record
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const image = await Image.findByPk(id);
    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }

    await imageService.deleteImage(id);
    return res.json({ success: true, message: 'Image deleted successfully' });
  } catch (err) {
    console.error('DELETE /api/images/:id error:', err);
    return res.status(500).json({ error: 'Failed to delete image', details: err.message });
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

    return res.json({ success: true, result });
  } catch (err) {
    console.error('POST /api/images/bulk error:', err);
    return res.status(500).json({ error: 'Bulk operation failed', details: err.message });
  }
});

// POST /api/images/:id/regenerate-thumbnails — admin action
router.post('/:id/regenerate-thumbnails', async (req, res) => {
  try {
    const { id } = req.params;
    const image = await Image.findByPk(id);
    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }

    const uploadsDir = path.join(__dirname, '..', 'uploads');
    const originalPath = path.join(uploadsDir, image.filename);

    if (!fs.existsSync(originalPath)) {
      return res.status(404).json({ error: 'Original image file not found on disk' });
    }

    await thumbnailService.generateThumbnails(originalPath, image.filename, {
      rotation: image.rotation || 0
    });

    return res.json({ success: true, message: 'Thumbnails regenerated successfully' });
  } catch (err) {
    console.error('POST /api/images/:id/regenerate-thumbnails error:', err);
    return res.status(500).json({ error: 'Failed to regenerate thumbnails', details: err.message });
  }
});

module.exports = router;