const express = require('express');
const router = express.Router();

const galleryRouter = require('./gallery');
const uploadRouter = require('./upload');
const searchRouter = require('./search');
const tagsRouter = require('./tags');
const imageTagsRouter = require('./imageTags');

// Mount routes
router.use('/gallery', galleryRouter);
router.use('/upload', uploadRouter);
router.use('/search', searchRouter);
router.use('/tags', tagsRouter);
router.use('/image-tags', imageTagsRouter);

// API search routes (mounted separately to handle /api/search/*)
router.use('/', searchRouter);

// Home redirect
router.get('/', (req, res) => {
  res.redirect('/gallery');
});

module.exports = router;