const express = require('express');
const router = express.Router();
const Tag = require('../models/Tag');
const Image = require('../models/Image');
const ImageTag = require('../models/ImageTag');

// GET /api/tags — list all tags
router.get('/', async (req, res) => {
  try {
    const tags = await Tag.findAll({ order: [['name', 'ASC']] });
    res.json(tags);
  } catch (err) {
    console.error('GET /api/tags error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/tags/by-name/:name — find tag by name
router.get('/by-name/:name', async (req, res) => {
  try {
    const tag = await Tag.findOne({
      where: { name: req.params.name.toLowerCase().trim() }
    });

    if (!tag) {
      return res.status(404).json({ error: 'Tag not found' });
    }

    res.json(tag);
  } catch (err) {
    console.error('GET /api/tags/by-name/:name error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/tags — create a tag
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Tag name is required' });
    }

    const [tag, created] = await Tag.findOrCreate({
      where: { name: name.trim().toLowerCase() },
      defaults: { name: name.trim().toLowerCase() }
    });

    res.status(created ? 201 : 200).json(tag);
  } catch (err) {
    console.error('POST /api/tags error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/tags/images/:imageId — add tag to image
router.post('/images/:imageId', async (req, res) => {
  try {
    const { tagName } = req.body;
    if (!tagName || !tagName.trim()) {
      return res.status(400).json({ error: 'tagName is required' });
    }

    const image = await Image.findByPk(req.params.imageId);
    if (!image) return res.status(404).json({ error: 'Image not found' });

    const [tag] = await Tag.findOrCreate({
      where: { name: tagName.trim().toLowerCase() },
      defaults: { name: tagName.trim().toLowerCase() }
    });

    const [imageTag, created] = await ImageTag.findOrCreate({
      where: { imageId: image.id, tagId: tag.id }
    });

    res.status(created ? 201 : 200).json({ tag, imageTag });
  } catch (err) {
    console.error('POST /api/tags/images/:imageId error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/tags/images/:imageId/:tagId — remove tag from image
router.delete('/images/:imageId/:tagId', async (req, res) => {
  try {
    const deleted = await ImageTag.destroy({
      where: { imageId: req.params.imageId, tagId: req.params.tagId }
    });

    if (!deleted) {
      return res.status(404).json({ error: 'Tag association not found' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/tags/images/:imageId/:tagId error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;