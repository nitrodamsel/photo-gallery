const express = require('express');
const router = express.Router();

const galleryRouter = require('./gallery');
const uploadRouter = require('./upload');
const tagsRouter = require('./tags');
const imageTagsRouter = require('./imageTags');

// Page routes
router.use('/gallery', galleryRouter);
router.use('/upload', uploadRouter);
router.use('/tags', tagsRouter);

// API routes
router.use('/api/tags', tagsRouter);
router.use('/api/images/:id/tags', imageTagsRouter);

// Home
router.get('/', (req, res) => {
  res.redirect('/gallery');
});

module.exports = router;