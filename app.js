const express = require('express');
const path = require('path');
const ejsLayouts = require('express-ejs-layouts');

const { errorHandler } = require('./middleware/errorHandler');
const routes = require('./routes/index');
const searchRouter = require('./routes/search');

const app = express();

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(ejsLayouts);
app.set('layout', 'layouts/base');

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Mount API routes before main routes to avoid layout rendering
app.use('/api/search', (req, res, next) => {
  // These are JSON API routes — skip layout
  req.skipLayout = true;
  next();
});
app.get('/api/search', searchRouter.stack ? null : require('./routes/search').handle, (req, res, next) => next());

// Main routes
app.use('/', routes);

// Mount API search routes explicitly
app.get('/api/search', async (req, res, next) => {
  try {
    const searchService = require('./services/searchService');
    const { buildSearchOptions } = require('./utils/queryBuilder');
    const searchOptions = buildSearchOptions(req.query);
    const results = await searchService.search(searchOptions);

    res.json({
      results: results.rows.map((img) => ({
        id: img.id,
        filename: img.filename,
        originalName: img.originalName,
        description: img.description,
        thumbnailPath: img.thumbnailPath,
        width: img.width,
        height: img.height,
        fileSize: img.fileSize,
        mimeType: img.mimeType,
        createdAt: img.createdAt,
        tags: img.tags || [],
        latitude: img.latitude,
        longitude: img.longitude,
      })),
      pagination: {
        page: results.page,
        limit: results.limit,
        count: results.count,
        totalPages: results.totalPages,
        hasNextPage: results.page < results.totalPages,
        hasPrevPage: results.page > 1,
      },
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

// 404 handler
app.use((req, res) => {
  res.status(404).render('404', { title: 'Page Not Found' });
});

// Error handler
app.use(errorHandler);

module.exports = app;