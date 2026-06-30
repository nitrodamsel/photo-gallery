const express = require('express');
const router = express.Router();

// Mount route modules
router.use('/', require('./gallery'));
router.use('/upload', require('./upload'));
router.use('/tags', require('./tags'));
router.use('/api/images', require('./imageTags'));
router.use('/api/tags', require('./tags'));

module.exports = router;