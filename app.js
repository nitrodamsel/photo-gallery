const express = require('express');
const path = require('path');
const morgan = require('morgan');

const { errorHandler } = require('./middleware/errorHandler');
const indexRouter = require('./routes/index');
const galleryRouter = require('./routes/gallery');
const uploadRouter = require('./routes/upload');
const tagsRouter = require('./routes/tags');
const imageTagsRouter = require('./routes/imageTags');

const app = express();

// View engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Middleware
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/', indexRouter);
app.use('/gallery', galleryRouter);
app.use('/upload', uploadRouter);

// Tag routes: page + API
app.use('/tags', tagsRouter);

// Tag API shortcut for autocomplete: GET /api/tags
app.use('/api/tags', (req, res, next) => {
  // Proxy to tags router's /api handler
  req.url = '/api' + (req.url === '/' ? '' : req.url);
  tagsRouter(req, res, next);
});

// Image tags API
app.use('/api/images', imageTagsRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).render('404', { title: 'Page Not Found' });
});

// Error handler
app.use(errorHandler);

module.exports = app;