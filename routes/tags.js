const express = require('express');
const router = express.Router();
const tagService = require('../services/tagService');

// GET /tags - Tag management page
router.get('/', async (req, res, next) => {
  try {
    const tags = await tagService.getAllTagsWithCounts();
    res.render('tags', { title: 'Tag Management', tags });
  } catch (err) {
    next(err);
  }
});

// GET /api/tags - JSON list, supports ?q= search
router.get('/api', async (req, res, next) => {
  try {
    const { q } = req.query;
    let tags;
    if (q && q.trim()) {
      tags = await tagService.searchTags(q.trim());
    } else {
      tags = await tagService.getAllTagsWithCounts();
    }
    res.json(tags);
  } catch (err) {
    next(err);
  }
});

// POST /api/tags - Create new tag
router.post('/api', async (req, res, next) => {
  try {
    const { name, color } = req.body;
    if (!name || name.trim().length < 2 || name.trim().length > 30) {
      return res.status(400).json({ error: 'Tag name must be between 2 and 30 characters.' });
    }
    const tag = await tagService.createTag(name.trim(), color);
    res.status(201).json(tag);
  } catch (err) {
    if (err.message && err.message.includes('already exists')) {
      return res.status(409).json({ error: err.message });
    }
    next(err);
  }
});

// PATCH /api/tags/:id - Rename tag
router.patch('/api/:id', async (req, res, next) => {
  try {
    const { name, color } = req.body;
    if (name !== undefined && (name.trim().length < 2 || name.trim().length > 30)) {
      return res.status(400).json({ error: 'Tag name must be between 2 and 30 characters.' });
    }
    const tag = await tagService.updateTag(req.params.id, { name: name ? name.trim() : undefined, color });
    res.json(tag);
  } catch (err) {
    if (err.message && (err.message.includes('not found') || err.message.includes('already exists'))) {
      return res.status(err.message.includes('not found') ? 404 : 409).json({ error: err.message });
    }
    next(err);
  }
});

// DELETE /api/tags/:id - Delete tag and all associations
router.delete('/api/:id', async (req, res, next) => {
  try {
    await tagService.deleteTag(req.params.id);
    res.json({ success: true });
  } catch (err) {
    if (err.message && err.message.includes('not found')) {
      return res.status(404).json({ error: err.message });
    }
    next(err);
  }
});

module.exports = router;