const express = require('express');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');

const indexRouter = require('./routes/index');
const uploadRouter = require('./routes/upload');
const galleryRouter = require('./routes/gallery');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const app = express();

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('layout', 'layouts/base');
app.use(expressLayouts);

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Template helpers available to all views
app.locals.formatFileSize = function(bytes) {
  if (!bytes) return 'Unknown';
  const b = parseInt(bytes);
  if (b >= 1024 * 1024) return (b / (1024 * 1024)).toFixed(2) + ' MB';
  if (b >= 1024) return (b / 1024).toFixed(1) + ' KB';
  return b + ' B';
};

app.locals.formatDate = function(date) {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
};

// Routes
app.use('/', indexRouter);
app.use('/upload', uploadRouter);
app.use('/gallery', galleryRouter);

// 404 handler (must be after all routes)
app.use(notFoundHandler);

// Error handler (must be last, 4 args)
app.use(errorHandler);

module.exports = app;