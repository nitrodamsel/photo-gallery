'use strict';

const express = require('express');
const path = require('path');
const morgan = require('morgan');
const compression = require('./middleware/compression');
const errorHandler = require('./middleware/errorHandler');
const cacheMiddleware = require('./middleware/cache');

const app = express();

// Trust proxy (for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// View engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

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
const thumbnailRouter = require('./routes/thumbnails');
const searchRouter = require('./routes/search');
const tagsRouter = require('./routes/tags');
const imageApiRouter = require('./routes/imageApi');
const imageTagsRouter = require('./routes/imageTags');
const adminRouter = require('./routes/admin');
const apiV1Router = require('./routes/api/v1/index');
const apiDocsRouter = require('./routes/api/docs');

// Mount routers
app.use('/', indexRouter);
app.use('/gallery', galleryRouter);
app.use('/upload', uploadRouter);
app.use('/thumbnails', thumbnailRouter);
app.use('/search', searchRouter);
app.use('/tags', tagsRouter);
app.use('/api/images', imageApiRouter);
app.use('/api/images', imageTagsRouter);
app.use('/admin', adminRouter);
app.use('/api/v1', apiV1Router);
app.use('/api/docs', apiDocsRouter);

// API error handler (JSON responses for /api routes)
app.use('/api', (err, req, res, next) => {
  const status = err.status || 500;
  const code = err.code || 'INTERNAL_ERROR';
  res.status(status).json({
    error: {
      code,
      message: err.message || 'An internal error occurred',
    },
  });
});

// 404 handler
app.use((req, res) => {
  if (req.originalUrl.startsWith('/api/')) {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.originalUrl} not found` },
    });
  }
  res.status(404).render('404', { title: 'Page Not Found' });
});

// General error handler
app.use(errorHandler);

module.exports = app;