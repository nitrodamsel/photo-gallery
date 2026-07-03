const express = require('express');
const router = express.Router();

const galleryRouter = require('./gallery');
const uploadRouter = require('./upload');
const tagsRouter = require('./tags');
const searchRouter = require('./search');
const imageApiRouter = require('./imageApi');
const imageTagsRouter = require('./imageTags');

// Mount API routes
router.use('/api/images', imageApiRouter);
router.use('/api/image-tags', imageTagsRouter);

// Mount page routes
router.use('/gallery', galleryRouter);
router.use('/upload', uploadRouter);
router.use('/tags', tagsRouter);
router.use('/search', searchRouter);

// Home route
router.get('/', (req, res) => {
  res.redirect('/gallery');
});

module.exports = router;