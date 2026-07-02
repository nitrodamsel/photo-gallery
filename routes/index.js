const express = require('express');
const router = express.Router();

router.use('/', require('./gallery'));
router.use('/gallery', require('./gallery'));
router.use('/upload', require('./upload'));
router.use('/search', require('./search'));
router.use('/tags', require('./tags'));
router.use('/api/images', require('./imageApi'));
router.use('/api/image-tags', require('./imageTags'));

module.exports = router;