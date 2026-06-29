const express = require('express');
const router = express.Router();
const { Image, Tag, ImageTag } = require('../models');
const tagService = require('../services/tagService');
const { Op } = require('sequelize');

const PAGE_SIZE = 24;

router.get('/', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const tagSlug = req.query.tag || null;
    const offset = (page - 1) * PAGE_SIZE;

    let whereClause = {};
    let includeClause = [
      {
        model: Tag,
        as: 'Tags',
        through: { attributes: [] },
        required: false
      }
    ];
    let currentTag = null;

    if (tagSlug) {
      currentTag = await Tag.findOne({ where: { slug: tagSlug } });
      if (currentTag) {
        includeClause = [
          {
            model: Tag,
            as: 'Tags',
            through: { attributes: [] },
            required: true,
            where: { slug: tagSlug }
          }
        ];
      }
    }

    const { count, rows: images } = await Image.findAndCountAll({
      where: whereClause,
      include: includeClause,
      order: [['createdAt', 'DESC']],
      limit: PAGE_SIZE,
      offset,
      distinct: true
    });

    const allTags = await tagService.getAllTagsWithCounts();

    res.render('gallery', {
      title: currentTag ? `Tag: ${currentTag.name}` : 'Gallery',
      activePage: 'gallery',
      images,
      currentTag,
      allTags,
      currentPage: page,
      totalPages: Math.ceil(count / PAGE_SIZE),
      totalImages: count
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;