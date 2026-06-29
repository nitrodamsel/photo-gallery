const express = require('express');
const router = express.Router();
const tagService = require('../services/tagService');

router.get('/', async (req, res, next) => {
  try {
    const tags = await tagService.getAllTagsWithCounts();
    res.render('home', {
      title: 'Photo Gallery',
      activePage: 'home',
      tags
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;