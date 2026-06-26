const express = require('express');
const router = express.Router();
const imageService = require('../services/imageService');

// GET /gallery
router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = parseInt(req.query.limit) || 12;
    const tag = req.query.tag || null;

    const { images, total } = await imageService.getImages({ page, limit, tag });
    const totalPages = Math.ceil(total / limit);

    res.render('gallery', {
      title: 'Gallery',
      images,
      total,
      page,
      limit,
      totalPages,
      tag,
      query: req.query,
    });
  } catch (err) {
    next(err);
  }
});

// GET /gallery/:id
router.get('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return next();

    const image = await imageService.getImageById(id);
    if (!image) {
      return res.status(404).render('404', { title: 'Image Not Found' });
    }

    const prevImage = await imageService.getPrevImage(id);
    const nextImage = await imageService.getNextImage(id);

    res.render('image-detail', {
      title: image.original_filename || `Image #${id}`,
      image,
      prevImage,
      nextImage,
    });
  } catch (err) {
    next(err);
  }
});

// GET /gallery/:id/prev
router.get('/:id/prev', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return next();

    const prevImage = await imageService.getPrevImage(id);
    if (!prevImage) {
      return res.redirect('/gallery');
    }
    res.redirect(`/gallery/${prevImage.id}`);
  } catch (err) {
    next(err);
  }
});

// GET /gallery/:id/next
router.get('/:id/next', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return next();

    const nextImage = await imageService.getNextImage(id);
    if (!nextImage) {
      return res.redirect('/gallery');
    }
    res.redirect(`/gallery/${nextImage.id}`);
  } catch (err) {
    next(err);
  }
});

module.exports = router;