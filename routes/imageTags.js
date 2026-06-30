const express = require('express');
const router = express.Router({ mergeParams: true });
const tagService = require('../services/tagService');
const { Image } = require('../models');

// POST /api/images/:id/tags — assign tag to image
router.post('/', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { tagName } = req.body;

    if (!tagName || !tagName.trim()) {
      return res.status(400).json({ error: 'tagName is required' });
    }

    // Check image exists
    const image = await Image.findByPk(id);
    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }

    const updatedTags = await tagService.assignTag(id, tagName.trim());
    res.json({ tags: updatedTags });
  } catch (err) {
    if (err.message && err.message.includes('Invalid')) {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
});

// DELETE /api/images/:id/tags/:tagId — remove tag from image
router.delete('/:tagId', async (req, res, next) => {
  try {
    const { id, tagId } = req.params;

    // Check image exists
    const image = await Image.findByPk(id);
    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }

    const updatedTags = await tagService.removeTag(id, tagId);
    res.json({ tags: updatedTags });
  } catch (err) {
    next(err);
  }
});

module.exports = router;