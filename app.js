const express = require('express');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');

const app = express();

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layouts/base');

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
const indexRouter = require('./routes/index');
const galleryRouter = require('./routes/gallery');
const uploadRouter = require('./routes/upload');
const tagsRouter = require('./routes/tags');
const imageTagsRouter = require('./routes/imageTags');

app.use('/', indexRouter);
app.use('/gallery', galleryRouter);
app.use('/upload', uploadRouter);

// Tags routes - page and API
app.use('/tags', tagsRouter);
app.use('/api/tags', tagsRouter);  // Mount tag API under /api/tags

// Image tags API
app.use('/api/images/:id/tags', imageTagsRouter);

// 404 handler
app.use((req, res, next) => {
  res.status(404).render('404', { title: 'Page Not Found', activePage: '' });
});

// Error handler
const errorHandler = require('./middleware/errorHandler');
app.use(errorHandler);

module.exports = app;