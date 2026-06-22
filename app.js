'use strict';

const express = require('express');
const morgan = require('morgan');
const path = require('path');

// Load routes
const indexRouter = require('./routes/index');

/**
 * Express App Factory
 * Registers middleware, mounts routers, and exports the app instance.
 */
function createApp() {
  const app = express();

  // ── View Engine ──────────────────────────────────────────────────────────────
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));

  // ── Middleware ────────────────────────────────────────────────────────────────
  // HTTP request logger
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

  // Parse JSON bodies
  app.use(express.json());

  // Parse URL-encoded bodies (form submissions)
  app.use(express.urlencoded({ extended: true }));

  // Serve static assets from /public
  app.use(express.static(path.join(__dirname, 'public')));

  // ── Routers ───────────────────────────────────────────────────────────────────
  app.use('/', indexRouter);

  // ── 404 Handler ──────────────────────────────────────────────────────────────
  app.use((req, res, next) => {
    res.status(404).render('error', {
      title: 'Page Not Found',
      statusCode: 404,
      message: `The page you are looking for — ${req.originalUrl} — does not exist.`,
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