const express = require('express');
const router = express.Router();
const tagService = require('../services/tagService');
const { Image, Tag, ImageTag } = require('../models');

// POST /api/images/:id/tags — assign tag to image
router.post('/:id/tags', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { tagName, color } = req.body;

    if (!tagName || tagName.trim().length < 2 || tagName.trim().length > 30) {
      return res.status(400).json({ error: 'Tag name must be between 2 and 30 characters.' });
    }
    if (!/^[a-zA-Z0-9\- ]+$/.test(tagName.trim())) {
      return res.status(400).json({ error: 'Tag name can only contain letters, numbers, hyphens, and spaces.' });
    }

    const image = await Image.findByPk(id);
    if (!image) {
      return res.status(404).json({ error: 'Image not found.' });
    }

    await tagService.assignTag(id, tagName.trim(), color);

    // Return updated tag list
    const updatedImage = await Image.findByPk(id, {
      include: [{
        model: Tag,
        through: { attributes: [] }
      }]
    });

    res.json({ tags: updatedImage.Tags });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/images/:id/tags/:tagId — remove tag from image
router.delete('/:id/tags/:tagId', async (req, res, next) => {
  try {
    const { id, tagId } = req.params;

    const image = await Image.findByPk(id);
    if (!image) {
      return res.status(404).json({ error: 'Image not found.' });
    }

    await tagService.removeTag(id, tagId);

    // Return updated tag list
    const updatedImage = await Image.findByPk(id, {
      include: [{
        model: Tag,
        through: { attributes: [] }
      }]
    });

    res.json({ tags: updatedImage.Tags });
  } catch (err) {
    next(err);
  }
});

module.exports = router;