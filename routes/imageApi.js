const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { Image, Tag, ImageTag } = require('../models');
const imageService = require('../services/imageService');
const thumbnailService = require('../services/thumbnailService');
const bulkService = require('../services/bulkService');
const exifService = require('../services/exifService');

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
        const uploadsDir = path.join(__dirname, '..', 'uploads');
        const originalPath = path.join(uploadsDir, image.filename);
        if (fs.existsSync(originalPath)) {
          await thumbnailService.generateThumbnails(originalPath, image.filename, {
            rotation: updateData.rotation
          });
        }
      } catch (thumbErr) {
        console.error('Thumbnail regeneration failed:', thumbErr);
        // Don't fail the whole request
      }
    }

    const updatedImage = await Image.findByPk(id, {
      include: [{ model: Tag, as: 'tags', through: { attributes: [] } }]
    });

    // Parse manualExif for response
    let parsedManualExif = {};
    if (updatedImage.manualExif) {
      try {
        parsedManualExif = typeof updatedImage.manualExif === 'string'
          ? JSON.parse(updatedImage.manualExif)
          : updatedImage.manualExif;
      } catch (e) {
        parsedManualExif = {};
      }
    }

    return res.json({
      success: true,
      image: {
        id: updatedImage.id,
        filename: updatedImage.filename,
        description: updatedImage.description,
        rotation: updatedImage.rotation || 0,
        manualExif: parsedManualExif,
        tags: updatedImage.tags || []
      }
    });
  } catch (err) {
    console.error('Error updating image:', err);
    return res.status(500).json({ error: 'Failed to update image', details: err.message });
  }
});

// DELETE /api/images/:id - Delete image
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const image = await Image.findByPk(id);
    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }

    await imageService.deleteImage(image);

    return res.json({ success: true, message: 'Image deleted successfully' });
  } catch (err) {
    console.error('Error deleting image:', err);
    return res.status(500).json({ error: 'Failed to delete image', details: err.message });
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

    return res.json({ success: true, result });
  } catch (err) {
    console.error('Error performing bulk operation:', err);
    return res.status(500).json({ error: 'Bulk operation failed', details: err.message });
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
    console.error('Error regenerating thumbnails:', err);
    return res.status(500).json({ error: 'Failed to regenerate thumbnails', details: err.message });
  }
});

module.exports = router;