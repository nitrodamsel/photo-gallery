const express = require('express');
const path = require('path');
const app = express();

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Body parsing
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Template helpers
app.locals.formatFileSize = function(bytes) {
  if (!bytes) return 'Unknown';
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + sizes[i];
};

// Routes
const indexRouter = require('./routes/index');
const uploadRouter = require('./routes/upload');
const galleryRouter = require('./routes/gallery');

app.use('/', indexRouter);
app.use('/upload', uploadRouter);
app.use('/gallery', galleryRouter);

// 404 handler — must come after all routes
app.use(function(req, res, next) {
  const err = new Error('Page not found');
  err.status = 404;
  next(err);
});

// Error handler — must be last
const errorHandler = require('./middleware/errorHandler');
app.use(errorHandler);

module.exports = app;