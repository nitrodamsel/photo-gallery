const express = require('express');
const path = require('path');
const morgan = require('morgan');

const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const app = express();

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

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
const searchRouter = require('./routes/search');
const imageTagsRouter = require('./routes/imageTags');

app.use('/', indexRouter);
app.use('/gallery', galleryRouter);
app.use('/upload', uploadRouter);
app.use('/tags', tagsRouter);
app.use('/search', searchRouter);
app.use('/image-tags', imageTagsRouter);

// API routes
app.get('/api/search', async (req, res, next) => {
  try {
    const { buildSearchOptions } = require('./utils/queryBuilder');
    const searchService = require('./services/searchService');
    const searchOptions = buildSearchOptions(req.query);
    const { rows, count, totalPages } = await searchService.search(searchOptions);
    res.json({
      results: rows,
      pagination: {
        total: count,
        totalPages,
        currentPage: searchOptions.page,
        limit: searchOptions.limit,
      },
      query: searchOptions,
    });
  } catch (err) {
    next(err);
  }
});

app.get('/api/search/facets', async (req, res, next) => {
  try {
    const searchService = require('./services/searchService');
    const facets = await searchService.getFacets();
    res.json(facets);
  } catch (err) {
    next(err);
  }
});

// 404 & Error handlers
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;