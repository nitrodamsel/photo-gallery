const express = require('express');
const router = express.Router();
const { Image, Tag, ImageTag } = require('../models');
const { Op } = require('sequelize');

// GET /gallery — main gallery page
router.get('/', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 24;
    const offset = (page - 1) * limit;
    const currentTag = req.query.tag || null;
    const currentSort = req.query.sort || 'newest';
    const currentSearch = req.query.q || null;

    // Build where clause
    const where = {};
    if (currentSearch) {
      where[Op.or] = [
        { description: { [Op.like]: `%${currentSearch}%` } },
        { originalName: { [Op.like]: `%${currentSearch}%` } }
      ];
    }

    // Build order
    let order = [['createdAt', 'DESC']];
    if (currentSort === 'oldest') order = [['createdAt', 'ASC']];
    else if (currentSort === 'name') order = [['originalName', 'ASC']];

    // Build include with optional tag filter
    const tagInclude = {
      model: Tag,
      through: { attributes: [] }
    };
    if (currentTag) {
      tagInclude.where = { name: currentTag };
      tagInclude.required = true;
    }

    const { count, rows: images } = await Image.findAndCountAll({
      where,
      include: [tagInclude],
      order,
      limit,
      offset,
      distinct: true
    });

    // Get all tags for filter panel
    const tags = await Tag.findAll({ order: [['name', 'ASC']] });

    const totalPages = Math.ceil(count / limit);

    res.render('gallery', {
      images,
      tags,
      page,
      totalPages,
      currentTag,
      currentSort,
      currentSearch,
      total: count
    });
  } catch (err) {
    next(err);
  }
});

// GET /images/:id — image detail page
router.get('/:id', async (req, res, next) => {
  try {
    const image = await Image.findByPk(req.params.id, {
      include: [{ model: Tag, through: { attributes: [] } }]
    });

    if (!image) {
      return res.status(404).render('404', { title: 'Image Not Found' });
    }

    // Get all tags for the tag-add UI
    const allTags = await Tag.findAll({ order: [['name', 'ASC']] });

    res.render('image-detail', { image, allTags, title: image.originalName || 'Image Detail' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;