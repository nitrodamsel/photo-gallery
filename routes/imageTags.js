const express = require('express');
const router = express.Router({ mergeParams: true });
const tagService = require('../services/tagService');
const { Image } = require('../models');

// POST /api/images/:id/tags - Assign tag to image
router.post('/', async (req, res, next) => {
  try {
    const imageId = req.params.id;
    const { tagName } = req.body;

    if (!tagName) {
      return res.status(400).json({ error: 'tagName is required' });
    }

    // Verify image exists
    const image = await Image.findByPk(imageId);
    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }

    const updatedTags = await tagService.assignTag(imageId, tagName);
    res.json({ tags: updatedTags });
  } catch (err) {
    if (err.message && err.message.includes('Invalid')) {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
});

// DELETE /api/images/:id/tags/:tagId - Remove tag from image
router.delete('/:tagId', async (req, res, next) => {
  try {
    const imageId = req.params.id;
    const tagId = req.params.tagId;

    // Verify image exists
    const image = await Image.findByPk(imageId);
    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }

    const updatedTags = await tagService.removeTagFromImage(imageId, tagId);
    res.json({ tags: updatedTags });
  } catch (err) {
    next(err);
  }
});

module.exports = router;