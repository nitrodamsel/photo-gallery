'use strict';

const express = require('express');
const path = require('path');
const morgan = require('morgan');
const ejsLayouts = require('express-ejs-layouts');
const compression = require('./middleware/compression');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(ejsLayouts);
app.set('layout', 'layouts/base');

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Compression
app.use(compression);

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
const indexRouter = require('./routes/index');
const galleryRouter = require('./routes/gallery');
const uploadRouter = require('./routes/upload');
const searchRouter = require('./routes/search');
const tagsRouter = require('./routes/tags');
const thumbnailsRouter = require('./routes/thumbnails');
const imageApiRouter = require('./routes/imageApi');
const imageTagsRouter = require('./routes/imageTags');
const adminRouter = require('./routes/admin');
const apiDocsRouter = require('./routes/api/docs');
const apiV1Router = require('./routes/api/v1/index');

// Web routes
app.use('/', indexRouter);
app.use('/gallery', galleryRouter);
app.use('/upload', uploadRouter);
app.use('/search', searchRouter);
app.use('/tags', tagsRouter);
app.use('/thumbnails', thumbnailsRouter);
app.use('/images', imageApiRouter);
app.use('/images', imageTagsRouter);

// Admin routes
app.use('/admin', adminRouter);

// API routes
app.use('/api/docs', apiDocsRouter);
app.use('/api/v1', apiV1Router);

// 404
app.use((req, res, next) => {
  res.status(404).render('404', { title: '404 Not Found', layout: 'layouts/base' });
});

// Error handler
app.use(errorHandler);

module.exports = app;