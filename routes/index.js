const express = require('express');
const router = express.Router();

// Mount route modules
router.use('/', require('./gallery'));
router.use('/upload', require('./upload'));
router.use('/tags', require('./tags'));

// API routes
router.use('/api/tags', require('./tags').api || createTagApiRouter());
router.use('/api/images', require('./imageTags').parent || createImageTagsParentRouter());

function createTagApiRouter() {
  const tagsRouter = require('./tags');
  return tagsRouter;
}

function createImageTagsParentRouter() {
  const imageTagsRouter = require('./imageTags');
  return imageTagsRouter;
}

module.exports = router;