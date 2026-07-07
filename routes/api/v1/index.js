'use strict';

const express = require('express');
const router = express.Router();
const auth = require('../../../middleware/auth');
const rateLimiter = require('../../../middleware/rateLimiter');
const imagesRouter = require('./images');
const tagsRouter = require('./tags');
const searchRouter = require('./search');

// Apply auth and rate limiting to all v1 API routes
router.use(auth);
router.use(rateLimiter);

// Mount sub-routers
router.use('/images', imagesRouter);
router.use('/tags', tagsRouter);
router.use('/search', searchRouter);

// API v1 info endpoint
router.get('/', (req, res) => {
  res.json({
    version: '1.0.0',
    endpoints: {
      images: '/api/v1/images',
      tags: '/api/v1/tags',
      search: '/api/v1/search',
      searchFacets: '/api/v1/search/facets',
      docs: '/api/docs',
      docsUI: '/api/docs/ui',
    },
  });
});

module.exports = router;