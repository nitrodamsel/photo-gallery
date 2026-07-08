'use strict';

const express = require('express');
const router = express.Router();
const apiKeyAuth = require('../../../middleware/auth');
const rateLimiter = require('../../../middleware/rateLimiter');

// Apply auth and rate limiting to all v1 routes
router.use(apiKeyAuth);
router.use(rateLimiter);

// Mount sub-routers
router.use('/images', require('./images'));
router.use('/tags', require('./tags'));
router.use('/search', require('./search'));

// API v1 info endpoint
router.get('/', (req, res) => {
  res.json({
    version: '1.0.0',
    endpoints: {
      images: '/api/v1/images',
      tags: '/api/v1/tags',
      search: '/api/v1/search',
    },
  });
});

module.exports = router;