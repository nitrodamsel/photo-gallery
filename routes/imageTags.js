const express = require('express');
const router = express.Router({ mergeParams: true });
const tagService = require('../services/tagService');
const { Image, Tag, ImageTag } = require('../models');

// POST /api/images/:id/tags - Assign tag to image
router.post('/', async (req, res, next) => {
  try {
    const imageId = req.params.id;
    const { tagName, color } = req.body;

    if (!tagName || tagName.trim().length < 2) {
      return res.status(400).json({ error: 'Tag name must be at least 2 characters.' });
    }
    if (tagName.trim().length > 30) {
      return res.status(400).json({ error: 'Tag name must be 30 characters or fewer.' });
    }
    if (!/^[a-zA-Z0-9\- ]+$/.test(tagName.trim())) {
      return res.status(400).json({ error: 'Tag name may only contain letters, numbers, hyphens, and spaces.' });
    }

    const image = await Image.findByPk(imageId);
    if (!image) {
      return res.status(404).json({ error: 'Image not found.' });
    }

    const updatedTags = await tagService.assignTag(imageId, tagName.trim(), color);
    res.json({ tags: updatedTags });
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

    const updatedTags = await tagService.removeTag(imageId, tagId);
    res.json({ tags: updatedTags });
  } catch (err) {
    next(err);
  }
});

module.exports = router;