'use strict';

const express = require('express');
const path = require('path');
const morgan = require('morgan');
const compression = require('./middleware/compression');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// View engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Middleware
app.use(morgan('dev'));
app.use(compression);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
const indexRouter = require('./routes/index');
const galleryRouter = require('./routes/gallery');
const uploadRouter = require('./routes/upload');
const searchRouter = require('./routes/search');
const tagsRouter = require('./routes/tags');
const imageApiRouter = require('./routes/imageApi');
const imageTagsRouter = require('./routes/imageTags');
const thumbnailsRouter = require('./routes/thumbnails');
const adminRouter = require('./routes/admin');

// API v1 routes
const apiV1Router = require('./routes/api/v1/index');
// API docs
const apiDocsRouter = require('./routes/api/docs');

app.use('/', indexRouter);
app.use('/gallery', galleryRouter);
app.use('/upload', uploadRouter);
app.use('/search', searchRouter);
app.use('/tags', tagsRouter);
app.use('/images', imageApiRouter);
app.use('/image-tags', imageTagsRouter);
app.use('/thumbnails', thumbnailsRouter);
app.use('/admin', adminRouter);

// API routes
app.use('/api/docs', apiDocsRouter);
app.use('/api/v1', apiV1Router);

// 404 handler
app.use((req, res) => {
  res.status(404).render('404', { title: 'Page Not Found' });
});

// Error handler
app.use(errorHandler);

module.exports = app;