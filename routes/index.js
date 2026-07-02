const express = require('express');
const router = express.Router();

router.use('/', require('./gallery'));
router.use('/upload', require('./upload'));
router.use('/tags', require('./tags'));
router.use('/search', require('./search'));
router.use('/api/images', require('./imageApi'));
router.use('/api/images', require('./imageTags'));

module.exports = router;