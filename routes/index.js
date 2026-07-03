const express = require('express');
const router = express.Router();

const galleryRouter = require('./gallery');
const uploadRouter = require('./upload');
const tagsRouter = require('./tags');
const searchRouter = require('./search');
const imageApiRouter = require('./imageApi');
const imageTagsRouter = require('./imageTags');

// Page routes
router.use('/gallery', galleryRouter);
router.use('/upload', uploadRouter);
router.use('/tags', tagsRouter);
router.use('/search', searchRouter);

// Image detail page
router.get('/images/:id', async (req, res, next) => {
  try {
    const { Image, Tag } = require('../models');
    const image = await Image.findByPk(req.params.id, {
      include: [{ model: Tag, as: 'tags', through: { attributes: [] } }]
    });

    if (!image) {
      return res.status(404).render('404', { title: 'Image Not Found' });
    }

    res.render('image-detail', {
      title: image.originalName || image.filename,
      image
    });
  } catch (err) {
    next(err);
  }
});

// API routes
router.use('/api/images', imageApiRouter);
router.use('/api/images', imageTagsRouter);

// Home
router.get('/', (req, res) => {
  res.render('home', { title: 'Photo Gallery' });
});

module.exports = router;