const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const Image = require('../models/Image');
const imageService = require('../services/imageService');
const thumbnailService = require('../services/thumbnailService');
const bulkService = require('../services/bulkService');

// PATCH /api/images/:id - Update image metadata
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
      updates.manualExif = manualExif;
    }

    if (rotation !== undefined) {
      updates.rotation = rotation;
    }

    await image.update(updates);

    // Regenerate thumbnails if rotation changed
    if (rotation !== undefined && rotation !== previousRotation) {
      try {
        const uploadDir = path.join(__dirname, '..', 'uploads');
        const filePath = path.join(uploadDir, image.filename);
        await thumbnailService.generateThumbnails(filePath, image.filename, rotation);
      } catch (thumbErr) {
        console.error('Error regenerating thumbnails after rotation:', thumbErr);
      }
    }

    const updatedImage = await Image.findByPk(id);
    return res.json(updatedImage);
  } catch (err) {
    console.error('Error updating image:', err);
    return res.status(500).json({ error: 'Failed to update image' });
  }
});

// DELETE /api/images/:id - Delete image and files
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
    console.error('Error deleting image:', err);
    return res.status(500).json({ error: 'Failed to delete image' });
  }
});

// POST /api/images/bulk - Bulk operations
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
      case 'addTag':
        if (!payload || !payload.tagName) {
          return res.status(400).json({ error: 'payload.tagName is required for addTag action' });
        }
        result = await bulkService.bulkTag(imageIds, payload.tagName);
        break;

      case 'removeTag':
        if (!payload || !payload.tagId) {
          return res.status(400).json({ error: 'payload.tagId is required for removeTag action' });
        }
        result = await bulkService.bulkUntag(imageIds, payload.tagId);
        break;

      case 'delete':
        result = await bulkService.bulkDelete(imageIds);
        break;

      default:
        return res.status(400).json({ error: `Unknown action: ${action}` });
    }

    return res.json(result);
  } catch (err) {
    console.error('Error performing bulk action:', err);
    return res.status(500).json({ error: 'Failed to perform bulk action' });
  }
});

// POST /api/images/:id/regenerate-thumbnails - Admin action
router.post('/:id/regenerate-thumbnails', async (req, res) => {
  try {
    const { id } = req.params;
    const image = await Image.findByPk(id);
    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }

    const uploadDir = path.join(__dirname, '..', 'uploads');
    const filePath = path.join(uploadDir, image.filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Original image file not found' });
    }

    await thumbnailService.generateThumbnails(filePath, image.filename, image.rotation || 0);
    return res.json({ success: true, message: 'Thumbnails regenerated successfully' });
  } catch (err) {
    console.error('Error regenerating thumbnails:', err);
    return res.status(500).json({ error: 'Failed to regenerate thumbnails' });
  }
});

module.exports = router;