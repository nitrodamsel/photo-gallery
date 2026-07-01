const express = require('express');
const path = require('path');
const morgan = require('morgan');
const methodOverride = require('method-override');

const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const app = express();

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));

// Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
const routes = require('./routes');
app.use('/', routes);

// API search routes (direct mount for /api/search and /api/search/facets)
const searchRouter = require('./routes/search');
app.use('/api/search', searchRouter);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;