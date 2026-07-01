const express = require('express');
const router = express.Router();

const galleryRouter = require('./gallery');
const uploadRouter = require('./upload');
const tagsRouter = require('./tags');
const searchRouter = require('./search');
const imageTagsRouter = require('./imageTags');

// Home page
router.get('/', (req, res) => {
  res.redirect('/gallery');
});

// Mount sub-routers
router.use('/gallery', galleryRouter);
router.use('/upload', uploadRouter);
router.use('/tags', tagsRouter);
router.use('/search', searchRouter);
router.use('/image-tags', imageTagsRouter);

// API routes — mount search API endpoints
router.use('/api/search', searchRouter);

module.exports = router;