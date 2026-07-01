'use strict';

const express    = require('express');
const router     = express.Router();

const indexRoute  = require('./gallery');    // home → gallery
const galleryRoute = require('./gallery');
const uploadRoute  = require('./upload');
const tagsRoute    = require('./tags');
const imageTagsRoute = require('./imageTags');
const searchRoute  = require('./search');

router.use('/',        indexRoute);
router.use('/gallery', galleryRoute);
router.use('/upload',  uploadRoute);
router.use('/tags',    tagsRoute);
router.use('/image-tags', imageTagsRoute);

// Search: both the HTML page and the API endpoints
router.use('/search',     searchRoute);
router.use('/api/search', searchRoute);

module.exports = router;