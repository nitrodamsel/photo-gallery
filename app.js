'use strict';

require('dotenv').config();

const express = require('express');
const morgan = require('morgan');
const path = require('path');

const indexRouter = require('./routes/index');

/**
 * Express App Factory
 * Configures and returns the Express application instance.
 */
function createApp() {
  const app = express();

  // ── View Engine ──────────────────────────────────────────────────────────────
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));

  // ── Middleware ────────────────────────────────────────────────────────────────

  // HTTP request logger (skip in test environment)
  if (process.env.NODE_ENV !== 'test') {
    app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
  }

  // Parse JSON and URL-encoded request bodies
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Serve static assets from /public
  app.use(express.static(path.join(__dirname, 'public')));

  // ── Routes ────────────────────────────────────────────────────────────────────
  app.use('/', indexRouter);

  // ── 404 Handler ───────────────────────────────────────────────────────────────
  app.use((req, res, next) => {
    res.status(404).render('error', {
      title: 'Page Not Found',
      statusCode: 404,
      message: 'The page you are looking for does not exist.',
    });
  });

  // ── Global Error Handler ──────────────────────────────────────────────────────
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    console.error(err.stack);
    const statusCode = err.status || err.statusCode || 500;
    res.status(statusCode).render('error', {
      title: 'Something Went Wrong',
      statusCode,
      message:
        process.env.NODE_ENV === 'production'
          ? 'An unexpected error occurred. Please try again later.'
          : err.message,
    });
  });

  return app;
}

module.exports = createApp();