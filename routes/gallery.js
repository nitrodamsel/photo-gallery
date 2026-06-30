const express = require('express');
const router = express.Router();
const { Image, Tag, ImageTag } = require('../models');
const tagService = require('../services/tagService');
const { Op } = require('sequelize');
const path = require('path');

const PAGE_SIZE = 12;

router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const tagSlug = req.query.tag || null;
    const search = req.query.search || null;

    // Build where clause
    let where = {};
    let tagFilter = null;

    if (search) {
      where[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
        { originalName: { [Op.like]: `%${search}%` } }
      ];
    }

    if (tagSlug) {
      tagFilter = await Tag.findOne({ where: { slug: tagSlug } });
    }

    // Build include for tag filter
    const includeOpts = [
      {
        model: Tag,
        as: 'Tags',
        through: { attributes: [] },
        required: !!tagFilter,
        ...(tagFilter ? { where: { id: tagFilter.id } } : {})
      }
    ];

    const { count, rows: images } = await Image.findAndCountAll({
      where,
      include: includeOpts,
      order: [['createdAt', 'DESC']],
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
      distinct: true
    });

    const totalPages = Math.ceil(count / PAGE_SIZE);

    // Get tag cloud data
    const allTags = await tagService.getAllTagsWithCounts();

    res.render('gallery', {
      title: tagFilter ? `Gallery — #${tagFilter.name}` : 'Gallery',
      images,
      tags: allTags,
      currentTag: tagFilter,
      search,
      page,
      totalPages,
      count
    });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const image = await Image.findByPk(req.params.id, {
      include: [
        {
          model: Tag,
          as: 'Tags',
          through: { attributes: [] }
        }
      ]
    });

    if (!image) {
      return res.status(404).render('404', { title: 'Image Not Found' });
    }

    res.render('image-detail', {
      title: image.title || image.originalName,
      image,
      tags: image.Tags || []
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;