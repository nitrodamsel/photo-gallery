const express = require('express');
const path = require('path');
const morgan = require('morgan');
const compressionMiddleware = require('./middleware/compression');

// Routes
const indexRouter = require('./routes/index');
const galleryRouter = require('./routes/gallery');
const uploadRouter = require('./routes/upload');
const searchRouter = require('./routes/search');
const tagsRouter = require('./routes/tags');
const imageApiRouter = require('./routes/imageApi');
const imageTagsRouter = require('./routes/imageTags');
const thumbnailRouter = require('./routes/thumbnails');

// Middleware
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Compression middleware — must be near the top, before routes
app.use(compressionMiddleware);

// Logging
app.use(morgan('dev'));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// View engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Static files — served with moderate caching
app.use(
  express.static(path.join(__dirname, 'public'), {
    maxAge: '7d',
    etag: true,
    lastModified: true,
  })
);

// Uploads static directory (for direct access, if needed)
// Thumbnails are served via /thumbnails route for proper caching
app.use(
  '/uploads',
  express.static(path.join(__dirname, 'uploads'), {
    maxAge: '1d',
    etag: true,
  })
);

// Routes
app.use('/', indexRouter);
app.use('/gallery', galleryRouter);
app.use('/upload', uploadRouter);
app.use('/search', searchRouter);
app.use('/tags', tagsRouter);
app.use('/api/images', imageApiRouter);
app.use('/api/images', imageTagsRouter);
app.use('/thumbnails', thumbnailRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).render('404', { title: '404 Not Found', url: req.url });
});

// Error handler
app.use(errorHandler);

module.exports = app;