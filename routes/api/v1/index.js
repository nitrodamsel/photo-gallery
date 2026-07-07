'use strict';

const express = require('express');
const router = express.Router();
const apiKeyAuth = require('../../../middleware/auth');
const rateLimiter = require('../../../middleware/rateLimiter');

const imagesRouter = require('./images');
const tagsRouter = require('./tags');
const searchRouter = require('./search');

// Apply auth and rate limiting to all v1 routes
router.use(apiKeyAuth);
router.use(rateLimiter);

// Mount sub-routers
router.use('/images', imagesRouter);
router.use('/tags', tagsRouter);
router.use('/search', searchRouter);

// API v1 info
router.get('/', (req, res) => {
  res.json({
    version: '1.0.0',
    endpoints: [
      { path: '/api/v1/images', methods: ['GET', 'POST'] },
      { path: '/api/v1/images/:id', methods: ['GET', 'PATCH', 'DELETE'] },
      { path: '/api/v1/tags', methods: ['GET', 'POST'] },
      { path: '/api/v1/tags/:id', methods: ['GET', 'PATCH', 'DELETE'] },
      { path: '/api/v1/search', methods: ['GET'] },
      { path: '/api/v1/search/facets', methods: ['GET'] },
    ],
    documentation: '/api/docs',
  });
});

module.exports = router;