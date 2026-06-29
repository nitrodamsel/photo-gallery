const express = require('express');
const path = require('path');
const morgan = require('morgan');
const expressLayouts = require('express-ejs-layouts');

const app = express();

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layouts/base');
app.set('layout extractScripts', true);
app.set('layout extractStyles', true);

// Middleware
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
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
app.use('/tags', tagsRouter);

// API routes
app.use('/api/tags', tagsRouter);
app.use('/api/images/:id/tags', imageTagsRouter);

// Error handling
const errorHandler = require('./middleware/errorHandler');

// 404
app.use((req, res, next) => {
  res.status(404).render('404', { title: 'Page Not Found', currentPage: '' });
});

// Error handler
app.use(errorHandler);

module.exports = app;