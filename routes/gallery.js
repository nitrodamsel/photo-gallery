const express = require('express');
const router = express.Router();
const { Image, Tag, ImageTag, sequelize } = require('../models');
const tagService = require('../services/tagService');
const { Op } = require('sequelize');

// GET /gallery - main gallery page
router.get('/', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 12;
    const offset = (page - 1) * limit;
    const searchQuery = req.query.search || '';
    const tagSlug = req.query.tag || '';

    let whereClause = {};
    let includeClause = [
      {
        model: Tag,
        through: { attributes: [] },
        required: false
      }
    ];

    if (searchQuery) {
      whereClause[Op.or] = [
        { title: { [Op.like]: `%${searchQuery}%` } },
        { originalName: { [Op.like]: `%${searchQuery}%` } },
        { description: { [Op.like]: `%${searchQuery}%` } }
      ];
    }

    let activeTag = null;
    if (tagSlug) {
      activeTag = await Tag.findOne({ where: { slug: tagSlug } });
      if (activeTag) {
        includeClause[0].required = true;
        includeClause[0].where = { id: activeTag.id };
      }
    }

    const { count, rows: images } = await Image.findAndCountAll({
      where: whereClause,
      include: includeClause,
      order: [['createdAt', 'DESC']],
      limit,
      offset,
      distinct: true
    });

    const totalPages = Math.ceil(count / limit);
    const pagination = {
      currentPage: page,
      totalPages,
      totalCount: count,
      hasNext: page < totalPages,
      hasPrev: page > 1,
      nextPage: page + 1,
      prevPage: page - 1
    };

    // Get all tags for tag cloud in sidebar
    const allTags = await tagService.getAllTagsWithCounts();

    res.render('gallery', {
      title: activeTag ? `Tag: ${activeTag.name}` : 'Gallery',
      images,
      pagination,
      totalCount: count,
      searchQuery,
      activeTag,
      allTags,
      currentPage: 'gallery'
    });
  } catch (err) {
    next(err);
  }
});

// GET /gallery/images/:id - image detail page
router.get('/images/:id', async (req, res, next) => {
  try {
    const imageId = parseInt(req.params.id, 10);
    const image = await Image.findByPk(imageId, {
      include: [
        {
          model: Tag,
          through: { attributes: [] }
        }
      ]
    });

    if (!image) {
      return res.status(404).render('404', { title: 'Image Not Found', currentPage: '' });
    }

    // Get EXIF data if available
    let exifData = null;
    try {
      const exifService = require('../services/exifService');
      const imagePath = require('path').join(__dirname, '../uploads', image.filename);
      exifData = await exifService.getExifData(imagePath);
    } catch (e) {
      // EXIF extraction is optional
    }

    res.render('image-detail', {
      title: image.title || image.originalName || 'Image Detail',
      image,
      exifData,
      currentPage: 'gallery'
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /gallery/images/:id - delete an image
router.delete('/images/:id', async (req, res, next) => {
  try {
    const imageId = parseInt(req.params.id, 10);
    const image = await Image.findByPk(imageId);

    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }

    // Delete associated image tags first
    await ImageTag.destroy({ where: { imageId } });

    // Delete file from disk
    const fs = require('fs');
    const path = require('path');
    const filePath = path.join(__dirname, '../uploads', image.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await image.destroy();
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;