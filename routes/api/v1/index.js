'use strict';

const express = require('express');
const router = express.Router();
const authMiddleware = require('../../../middleware/auth');
const rateLimiter = require('../../../middleware/rateLimiter');

// Apply auth and rate limiting to all v1 API routes
router.use(authMiddleware);
router.use(rateLimiter);

// Mount sub-routers
router.use('/images', require('./images'));
router.use('/tags', require('./tags'));
router.use('/search', require('./search'));

module.exports = router;