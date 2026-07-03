const express = require('express');
const router = express.Router();

const galleryRouter = require('./gallery');
const uploadRouter = require('./upload');
const searchRouter = require('./search');
const tagsRouter = require('./tags');
const imageApiRouter = require('./imageApi');
const imageTagsRouter = require('./imageTags');

// Gallery routes
router.use('/gallery', galleryRouter);

// Upload routes
router.use('/upload', uploadRouter);

// Search routes
router.use('/search', searchRouter);

// Tags routes
router.use('/tags', tagsRouter);

// Image API routes (PATCH, DELETE, bulk, etc.)
router.use('/api/images', imageApiRouter);

// Image tags API
router.use('/api/images', imageTagsRouter);

// Home page
router.get('/', (req, res) => {
  res.redirect('/gallery');
});

module.exports = router;