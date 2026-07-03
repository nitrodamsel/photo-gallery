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
      // Merge with existing manualExif
      const existingManualExif = image.manualExif || {};
      updates.manualExif = { ...existingManualExif, ...manualExif };
    }

    if (rotation !== undefined) {
      const validRotations = [0, 90, 180, 270];
      if (!validRotations.includes(Number(rotation))) {
        return res.status(400).json({ error: 'Invalid rotation value. Must be 0, 90, 180, or 270.' });
      }
      updates.rotation = Number(rotation);
    }

    await image.update(updates);

    // Regenerate thumbnails if rotation changed
    if (rotation !== undefined && Number(rotation) !== previousRotation) {
      try {
        const uploadsDir = path.join(__dirname, '..', 'uploads');
        const filePath = path.join(uploadsDir, image.filename);
        if (fs.existsSync(filePath)) {
          await thumbnailService.generateThumbnails(filePath, image.filename, {
            rotation: updates.rotation
          });
        }
      } catch (thumbErr) {
        console.error('Failed to regenerate thumbnails after rotation:', thumbErr);
        // Don't fail the whole request
      }
    }

    const updatedImage = await Image.findByPk(id);
    res.json({ success: true, image: updatedImage });
  } catch (err) {
    console.error('Error updating image:', err);
    res.status(500).json({ error: 'Failed to update image' });
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
    res.json({ success: true, message: 'Image deleted successfully' });
  } catch (err) {
    console.error('Error deleting image:', err);
    res.status(500).json({ error: 'Failed to delete image' });
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

    res.json({ success: true, result });
  } catch (err) {
    console.error('Error performing bulk operation:', err);
    res.status(500).json({ error: 'Failed to perform bulk operation' });
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
    const filePath = path.join(uploadsDir, image.filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Image file not found on disk' });
    }

    await thumbnailService.generateThumbnails(filePath, image.filename, {
      rotation: image.rotation || 0
    });

    res.json({ success: true, message: 'Thumbnails regenerated successfully' });
  } catch (err) {
    console.error('Error regenerating thumbnails:', err);
    res.status(500).json({ error: 'Failed to regenerate thumbnails' });
  }
});

module.exports = router;