const express = require('express');
const router = express.Router();

router.use('/gallery', require('./gallery'));
router.use('/images', require('./gallery')); // alias for image detail
router.use('/upload', require('./upload'));
router.use('/tags', require('./tags'));
router.use('/search', require('./search'));
router.use('/api/images', require('./imageApi'));

// Home
router.get('/', (req, res) => {
  res.redirect('/gallery');
});

module.exports = router;