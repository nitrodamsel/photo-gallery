'use strict';

const express = require('express');
const router = express.Router();

const galleryRouter = require('./gallery');
const uploadRouter = require('./upload');
const searchRouter = require('./search');
const tagsRouter = require('./tags');
const imageApiRouter = require('./imageApi');
const imageTagsRouter = require('./imageTags');
const thumbnailRouter = require('./thumbnails');
const adminRouter = require('./admin');
const apiV1Router = require('./api/v1/index');
const apiDocsRouter = require('./api/docs');

// Gallery & UI routes
router.use('/', galleryRouter);
router.use('/upload', uploadRouter);
router.use('/search', searchRouter);
router.use('/tags', tagsRouter);

// Image API (non-versioned internal)
router.use('/images', imageApiRouter);
router.use('/images', imageTagsRouter);
router.use('/thumbnails', thumbnailRouter);

// Admin
router.use('/admin', adminRouter);

// REST API v1
router.use('/api/v1', apiV1Router);

// API Docs (no auth)
router.use('/api/docs', apiDocsRouter);

module.exports = router;