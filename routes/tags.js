const express = require('express');
const router = express.Router();
const tagService = require('../services/tagService');
const { Tag } = require('../models');
const { Op } = require('sequelize');

// GET /tags - Tag management page
router.get('/', async (req, res, next) => {
  try {
    const tags = await tagService.getAllTagsWithCounts();
    res.render('tags', {
      title: 'Tag Management',
      tags,
      activePage: 'tags'
    });
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
    if (!name || name.trim().length < 2) {
      return res.status(400).json({ error: 'Tag name must be at least 2 characters.' });
    }
    if (name.trim().length > 30) {
      return res.status(400).json({ error: 'Tag name must be 30 characters or fewer.' });
    }
    if (!/^[a-zA-Z0-9\- ]+$/.test(name.trim())) {
      return res.status(400).json({ error: 'Tag name may only contain letters, numbers, hyphens, and spaces.' });
    }

    const tag = await tagService.findOrCreateByName(name.trim(), color);
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
    const { id } = req.params;
    const { name } = req.body;

    if (!name || name.trim().length < 2) {
      return res.status(400).json({ error: 'Tag name must be at least 2 characters.' });
    }
    if (name.trim().length > 30) {
      return res.status(400).json({ error: 'Tag name must be 30 characters or fewer.' });
    }
    if (!/^[a-zA-Z0-9\- ]+$/.test(name.trim())) {
      return res.status(400).json({ error: 'Tag name may only contain letters, numbers, hyphens, and spaces.' });
    }

    const tag = await tagService.renameTag(id, name.trim());
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
    const { id } = req.params;
    await tagService.deleteTag(id);
    res.json({ success: true, message: 'Tag deleted successfully.' });
  } catch (err) {
    if (err.message && err.message.includes('not found')) {
      return res.status(404).json({ error: err.message });
    }
    next(err);
  }
});

module.exports = router;