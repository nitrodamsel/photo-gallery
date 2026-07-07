'use strict';

const express = require('express');
const router = express.Router();

const galleryRouter = require('./gallery');
const uploadRouter = require('./upload');
const imageApiRouter = require('./imageApi');
const imageTagsRouter = require('./imageTags');
const searchRouter = require('./search');
const tagsRouter = require('./tags');
const thumbnailsRouter = require('./thumbnails');
const adminRouter = require('./admin');
const apiV1Router = require('./api/v1/index');
const apiDocsRouter = require('./api/docs');

// Web UI routes
router.use('/', galleryRouter);
router.use('/upload', uploadRouter);
router.use('/images', imageApiRouter);
router.use('/images', imageTagsRouter);
router.use('/search', searchRouter);
router.use('/tags', tagsRouter);
router.use('/thumbnails', thumbnailsRouter);

// Admin routes
router.use('/admin', adminRouter);

// API routes
router.use('/api/docs', apiDocsRouter);
router.use('/api/v1', apiV1Router);

module.exports = router;