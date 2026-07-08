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
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Routes
const routes = require('./routes/index');
app.use('/', routes);

// 404 handler
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'API endpoint not found' },
    });
  }
  res.status(404).render('404', { title: '404 Not Found' });
});

// Error handler
app.use((err, req, res, next) => {
  // API error responses
  if (req.path.startsWith('/api')) {
    const status = err.status || 500;
    return res.status(status).json({
      error: {
        code: err.code || 'INTERNAL_ERROR',
        message: err.message || 'An internal error occurred',
      },
    });
  }
  // Web error responses
  errorHandler(err, req, res, next);
});

module.exports = app;