'use strict';

const express = require('express');
const router = express.Router();

// Mount API docs (no auth required)
router.use('/api/docs', require('./api/docs'));

// Mount API v1 routes (auth + rate-limit applied inside)
router.use('/api/v1', require('./api/v1/index'));

// Mount admin routes
router.use('/admin', require('./admin'));

// Mount other routes
router.use('/', require('./gallery'));

module.exports = router;