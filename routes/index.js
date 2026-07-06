const express = require('express');
const router = express.Router();
const cacheService = require('../services/cacheService');

// Mount sub-routers
router.use('/', require('./gallery'));
router.use('/upload', require('./upload'));
router.use('/search', require('./search'));
router.use('/tags', require('./tags'));
router.use('/thumbnails', require('./thumbnails'));
router.use('/api/images', require('./imageApi'));
router.use('/api/images', require('./imageTags'));

/**
 * GET /admin/cache
 * Returns LRU cache statistics.
 */
router.get('/admin/cache', (req, res) => {
  res.json({
    success: true,
    cache: cacheService.stats(),
  });
});

/**
 * DELETE /admin/cache
 * Flushes the entire LRU cache.
 */
router.delete('/admin/cache', (req, res) => {
  cacheService.flush();
  res.json({
    success: true,
    message: 'Cache flushed successfully',
  });
});

/**
 * POST /admin/cache/flush
 * Alternative flush endpoint for clients that can't send DELETE.
 */
router.post('/admin/cache/flush', (req, res) => {
  cacheService.flush();
  res.json({
    success: true,
    message: 'Cache flushed successfully',
  });
});

module.exports = router;