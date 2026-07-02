const express = require('express');
const router = express.Router();
const imageService = require('../services/imageService');
const thumbnailService = require('../services/thumbnailService');
const bulkService = require('../services/bulkService');
const { Image } = require('../models');
const path = require('path');

// PATCH /api/images/:id - Update image metadata, description, rotation
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { description, manualExif, rotation } = req.body;

    const image = await Image.findByPk(id);
    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }

    const previousRotation = image.rotation || 0;
    const updateData = {};

    if (description !== undefined) {
      updateData.description = description;
    }

    if (manualExif !== undefined) {
      updateData.manualExif = typeof manualExif === 'string'
        ? manualExif
        : JSON.stringify(manualExif);
    }

    if (rotation !== undefined) {
      const validRotations = [0, 90, 180, 270];
      const normalizedRotation = ((parseInt(rotation, 10) % 360) + 360) % 360;
      if (!validRotations.includes(normalizedRotation)) {
        return res.status(400).json({ error: 'Invalid rotation value. Must be 0, 90, 180, or 270.' });
      }
      updateData.rotation = normalizedRotation;
    }

    await image.update(updateData);

    // Regenerate thumbnails if rotation changed
    if (rotation !== undefined && updateData.rotation !== previousRotation) {
      try {
        const uploadDir = path.join(__dirname, '..', 'uploads');
        await thumbnailService.regenerateThumbnails(image, uploadDir);
      } catch (thumbErr) {
        console.error('Thumbnail regeneration failed:', thumbErr);
        // Don't fail the whole request if thumbnail regen fails
      }
    }

    const updatedImage = await Image.findByPk(id);

    let parsedManualExif = {};
    try {
      parsedManualExif = updatedImage.manualExif
        ? JSON.parse(updatedImage.manualExif)
        : {};
    } catch (e) {
      parsedManualExif = {};
    }

    res.json({
      id: updatedImage.id,
      description: updatedImage.description,
      rotation: updatedImage.rotation || 0,
      manualExif: parsedManualExif,
      filename: updatedImage.filename,
      originalName: updatedImage.originalName,
      updatedAt: updatedImage.updatedAt
    });
  } catch (err) {
    console.error('Error updating image:', err);
    res.status(500).json({ error: 'Failed to update image' });
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

    res.json({ success: true, message: 'Image deleted successfully' });
  } catch (err) {
    console.error('Error deleting image:', err);
    res.status(500).json({ error: 'Failed to delete image' });
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
    res.status(500).json({ error: 'Bulk operation failed' });
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
    await thumbnailService.regenerateThumbnails(image, uploadDir);

    res.json({ success: true, message: 'Thumbnails regenerated successfully' });
  } catch (err) {
    console.error('Error regenerating thumbnails:', err);
    res.status(500).json({ error: 'Failed to regenerate thumbnails' });
  }
});

module.exports = router;