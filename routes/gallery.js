const express = require('express');
const router = express.Router();
const imageService = require('../services/imageService');

// GET /gallery
router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = parseInt(req.query.limit) || 12;
    const tag = req.query.tag || null;

    const offset = (page - 1) * limit;

    const { images, total } = await imageService.getImages({ limit, offset, tag });

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
    if (isNaN(id)) return next({ status: 404, message: 'Image not found' });

    const image = await imageService.getImageById(id);
    if (!image) return next({ status: 404, message: 'Image not found' });

    const prev = await imageService.getPrevImage(id);
    const next_ = await imageService.getNextImage(id);

    res.render('image-detail', {
      title: image.original_filename || `Image #${id}`,
      image,
      prev,
      next: next_,
    });
  } catch (err) {
    next(err);
  }
});

// GET /gallery/:id/prev
router.get('/:id/prev', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const prev = await imageService.getPrevImage(id);
    if (prev) {
      res.redirect(`/gallery/${prev.id}`);
    } else {
      res.redirect(`/gallery/${id}`);
    }
  } catch (err) {
    next(err);
  }
});

// GET /gallery/:id/next
router.get('/:id/next', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const next_ = await imageService.getNextImage(id);
    if (next_) {
      res.redirect(`/gallery/${next_.id}`);
    } else {
      res.redirect(`/gallery/${id}`);
    }
  } catch (err) {
    next(err);
  }
});

module.exports = router;