'use strict';

const express = require('express');
const path = require('path');
const morgan = require('morgan');
const compression = require('./middleware/compression');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(morgan('dev'));
app.use(compression);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/', require('./routes/index'));
app.use('/gallery', require('./routes/gallery'));
app.use('/upload', require('./routes/upload'));
app.use('/search', require('./routes/search'));
app.use('/tags', require('./routes/tags'));
app.use('/images', require('./routes/imageApi'));
app.use('/image-tags', require('./routes/imageTags'));
app.use('/thumbnails', require('./routes/thumbnails'));

// Admin routes (basic-auth protected)
app.use('/admin', require('./routes/admin'));

// API docs (no auth required)
app.use('/api/docs', require('./routes/api/docs'));

// API v1 routes (API key auth + rate limiting)
app.use('/api/v1', require('./routes/api/v1/index'));

// 404 handler
app.use((req, res) => {
  res.status(404).render('404', { title: 'Page Not Found' });
});

// Error handler
app.use(errorHandler);

module.exports = app;