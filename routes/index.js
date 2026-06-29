const express = require('express');
const router = express.Router();

// GET / - home page
router.get('/', async (req, res, next) => {
  try {
    const { Image, Tag, ImageTag, sequelize } = require('../models');
    const tagService = require('../services/tagService');

    // Get recent images
    const recentImages = await Image.findAll({
      limit: 8,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: Tag,
          through: { attributes: [] }
        }
      ]
    });

    // Get tags with counts for tag cloud
    const tags = await tagService.getAllTagsWithCounts();

    res.render('home', {
      title: 'Photo Gallery',
      recentImages,
      tags,
      currentPage: 'home'
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;