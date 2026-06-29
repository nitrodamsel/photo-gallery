const express = require('express');
const router = express.Router();
const tagService = require('../services/tagService');

// GET / — home page
router.get('/', async (req, res, next) => {
  try {
    const tags = await tagService.getAllTagsWithCounts();
    res.render('home', {
      title: 'Photo Gallery',
      tags,
      currentPage: 'home'
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;