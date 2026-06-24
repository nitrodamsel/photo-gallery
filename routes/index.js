const express = require('express');
const router = express.Router();
const { getImages } = require('../services/imageService');

/**
 * GET /
 * Home / gallery page
 */
router.get('/', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 24;
    const search = req.query.search || null;
    const tags = req.query.tags ? req.query.tags.split(',').map(t => t.trim()).filter(Boolean) : [];

    const { rows: images, count, totalPages } = await getImages({ page, limit, search, tags });

    res.render('home', {
      title: 'Gallery',
      images,
      count,
      page,
      totalPages,
      search,
      tags,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;