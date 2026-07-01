const express = require('express');
const router = express.Router();

router.use('/', require('./gallery'));
router.use('/upload', require('./upload'));
router.use('/tags', require('./tags'));
router.use('/image-tags', require('./imageTags'));
router.use('/search', require('./search'));

// API routes
router.use('/api/search', require('./search'));

module.exports = router;