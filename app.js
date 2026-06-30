const express = require('express');
const path = require('path');
const ejsLayouts = require('express-ejs-layouts');

const { errorHandler } = require('./middleware/errorHandler');
const uploadMiddleware = require('./middleware/upload');

const app = express();

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// EJS Layouts (optional — only if package is available)
try {
  app.use(ejsLayouts);
  app.set('layout', 'layouts/base');
} catch (e) {
  // express-ejs-layouts not installed, skip
}

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
const galleryRouter = require('./routes/gallery');
const uploadRouter = require('./routes/upload');
const tagsRouter = require('./routes/tags');
const imageTagsRouter = require('./routes/imageTags');

app.use('/', galleryRouter);
app.use('/upload', uploadRouter);
app.use('/tags', tagsRouter);

// API routes
app.use('/api/tags', tagsRouter);
app.use('/api/images', imageTagsRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).render('404', { title: 'Page Not Found' });
});

// Error handler
app.use(errorHandler);

module.exports = app;