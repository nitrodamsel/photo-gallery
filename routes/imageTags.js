const express = require('express');
const router = express.Router({ mergeParams: true });
const tagService = require('../services/tagService');
const { Image } = require('../models');

// POST /api/images/:id/tags - Assign tag to image
router.post('/', async (req, res, next) => {
  try {
    const imageId = req.params.id;
    const { tagName } = req.body;

    if (!tagName || tagName.trim().length < 2 || tagName.trim().length > 30) {
      return res.status(400).json({ error: 'Tag name must be between 2 and 30 characters.' });
    }

    const image = await Image.findByPk(imageId);
    if (!image) {
      return res.status(404).json({ error: 'Image not found.' });
    }

    await tagService.assignTag(imageId, tagName.trim());
    const tags = await tagService.getTagsForImage(imageId);
    res.json({ tags });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/images/:id/tags/:tagId - Remove tag from image
router.delete('/:tagId', async (req, res, next) => {
  try {
    const { id: imageId, tagId } = req.params;

    const image = await Image.findByPk(imageId);
    if (!image) {
      return res.status(404).json({ error: 'Image not found.' });
    }

    await tagService.removeTag(imageId, tagId);
    const tags = await tagService.getTagsForImage(imageId);
    res.json({ tags });
  } catch (err) {
    next(err);
  }
});

module.exports = router;