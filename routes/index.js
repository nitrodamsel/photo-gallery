const express = require('express');
const router = express.Router();
const cacheService = require('../services/cacheService');
const imageService = require('../services/imageService');

/**
 * GET /
 * Home page with recent images
 */
router.get('/', async (req, res, next) => {
  try {
    const [recentImages, stats] = await Promise.all([
      imageService.getRecentImages(12),
      imageService.getImageStats(),
    ]);

    res.render('home', {
      title: 'Photo Gallery',
      images: recentImages,
      stats,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /admin/cache
 * View cache statistics and flush endpoint
 */
router.get('/admin/cache', (req, res) => {
  const stats = cacheService.stats();
  res.render('admin/cache', {
    title: 'Cache Administration',
    stats,
  });
});

/**
 * POST /admin/cache/flush
 * Flush the LRU cache
 */
router.post('/admin/cache/flush', (req, res) => {
  cacheService.flush();
  
  // Support both JSON and HTML responses
  if (req.headers.accept === 'application/json' || req.headers['content-type'] === 'application/json') {
    return res.json({ success: true, message: 'Cache flushed successfully' });
  }
  
  req.session && req.session.flash
    ? (req.session.flash = { type: 'success', message: 'Cache flushed successfully' })
    : null;
    
  res.redirect('/admin/cache');
});

/**
 * GET /admin/cache/stats (JSON API)
 */
router.get('/admin/cache/stats', (req, res) => {
  res.json(cacheService.stats());
});

module.exports = router;