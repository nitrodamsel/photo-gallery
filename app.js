const express = require('express');
const path = require('path');
const morgan = require('morgan');

// Middleware
const compressionMiddleware = require('./middleware/compression');
const errorHandler = require('./middleware/errorHandler');

// Routes
const indexRouter = require('./routes/index');
const galleryRouter = require('./routes/gallery');
const uploadRouter = require('./routes/upload');
const thumbnailsRouter = require('./routes/thumbnails');
const tagsRouter = require('./routes/tags');
const searchRouter = require('./routes/search');
const imageApiRouter = require('./routes/imageApi');
const imageTagsRouter = require('./routes/imageTags');

const app = express();

// View engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Apply compression early (before routes)
app.use(compressionMiddleware);

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files (served without compression filter — compression handles it)
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0,
  etag: true,
  lastModified: true,
}));

// Routes
app.use('/', indexRouter);
app.use('/gallery', galleryRouter);
app.use('/upload', uploadRouter);
app.use('/thumbnails', thumbnailsRouter);
app.use('/tags', tagsRouter);
app.use('/search', searchRouter);
app.use('/api/images', imageApiRouter);
app.use('/api/images', imageTagsRouter);

// 404 handler
app.use((req, res, next) => {
  res.status(404).render('404', {
    title: 'Page Not Found',
    message: `The page ${req.path} was not found.`,
  });
});

// Error handler (must be last)
app.use(errorHandler);

module.exports = app;