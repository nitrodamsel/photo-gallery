const express = require('express');
const router = express.Router();

router.use('/', require('./gallery'));
router.use('/upload', require('./upload'));
router.use('/tags', require('./tags'));
router.use('/api/images', require('./imageTags'));
router.use('/api/tags', require('./tags').router || createTagApiRouter());

function createTagApiRouter() {
  // The /api/tags routes are defined in routes/tags.js under the /api prefix
  // We just re-export a dedicated router here
  const tagRoutes = require('./tags');
  return tagRoutes;
}

module.exports = router;