const express = require('express');
const router = express.Router({ mergeParams: true });
const tagService = require('../services/tagService');
const { Image } = require('../models');

// POST /api/images/:id/tags - assign tag to image
router.post('/', async (req, res, next) => {
  try {
    const imageId = parseInt(req.params.id, 10);
    const { tagName } = req.body;

    if (!tagName || !tagName.trim()) {
      return res.status(400).json({ error: 'tagName is required' });
    }

    // Check image exists
    const image = await Image.findByPk(imageId);
    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }

    await tagService.assignTag(imageId, tagName.trim());

    // Return updated tags
    const updatedTags = await tagService.getTagsForImage(imageId);
    res.json({ tags: updatedTags });
  } catch (err) {
    if (err.message && err.message.includes('Invalid')) {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
});

// DELETE /api/images/:id/tags/:tagId - remove tag from image
router.delete('/:tagId', async (req, res, next) => {
  try {
    const imageId = parseInt(req.params.id, 10);
    const tagId = parseInt(req.params.tagId, 10);

    // Check image exists
    const image = await Image.findByPk(imageId);
    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }

    await tagService.removeTag(imageId, tagId);

    // Return updated tags
    const updatedTags = await tagService.getTagsForImage(imageId);
    res.json({ tags: updatedTags });
  } catch (err) {
    next(err);
  }
});

module.exports = router;