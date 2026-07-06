const express = require('express');
const router = express.Router();
const cacheService = require('../services/cacheService');

// Home page
router.get('/', async (req, res) => {
  try {
    res.render('home', {
      title: 'Photo Gallery',
    });
  } catch (err) {
    res.status(500).render('error', { error: err, title: 'Error' });
  }
});

// Admin: flush LRU cache
router.post('/admin/cache/flush', (req, res) => {
  cacheService.flush();
  res.json({ success: true, message: 'Cache flushed successfully' });
});

// Admin: cache stats
router.get('/admin/cache', (req, res) => {
  const stats = cacheService.stats();
  res.json({
    success: true,
    cache: stats,
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;