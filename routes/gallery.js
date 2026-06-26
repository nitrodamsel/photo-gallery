const express = require('express');
const router = express.Router();
const imageService = require('../services/imageService');

// GET /gallery - paginated grid of image cards
router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = parseInt(req.query.limit) || 12;
    const tag = req.query.tag || null;

    const result = await imageService.getImages({ page, limit, tag });

    res.render('gallery', {
      title: 'Gallery',
      images: result.images,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
      },
      activeTag: tag,
      query: req.query,
    });
  } catch (err) {
    next(err);
  }
});

// GET /gallery/:id - full detail page
router.get('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return next();

    const image = await imageService.getImageById(id);
    if (!image) {
      return res.status(404).render('404', {
        title: 'Image Not Found',
        message: 'The image you are looking for does not exist.',
      });
    }

    // Fetch prev/next based on upload order
    const prev = await imageService.getPrevImage(id);
    const next_ = await imageService.getNextImage(id);

    res.render('image-detail', {
      title: image.original_filename || `Image #${id}`,
      image,
      prevImage: prev,
      nextImage: next_,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;