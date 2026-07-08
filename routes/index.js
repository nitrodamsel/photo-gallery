'use strict';

const express = require('express');
const router = express.Router();

const galleryRouter = require('./gallery');
const uploadRouter = require('./upload');
const searchRouter = require('./search');
const tagsRouter = require('./tags');
const thumbnailsRouter = require('./thumbnails');
const imageApiRouter = require('./imageApi');
const imageTagsRouter = require('./imageTags');
const adminRouter = require('./admin');
const apiV1Router = require('./api/v1/index');
const apiDocsRouter = require('./api/docs');

// Web routes
router.use('/', galleryRouter);
router.use('/upload', uploadRouter);
router.use('/search', searchRouter);
router.use('/tags', tagsRouter);
router.use('/thumbnails', thumbnailsRouter);

// Admin
router.use('/admin', adminRouter);

// API docs (no auth)
router.use('/api/docs', apiDocsRouter);

// API v1 (auth + rate limit applied inside)
router.use('/api/v1', apiV1Router);

// Legacy image API
router.use('/api/images', imageApiRouter);
router.use('/api/images', imageTagsRouter);

module.exports = router;