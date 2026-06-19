'use strict';

const express = require('express');
const morgan = require('morgan');
const path = require('path');

const config = require('./config');
const indexRouter = require('./routes/index');

const app = express();

// ─── View Engine ────────────────────────────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ─── Middleware ──────────────────────────────────────────────────────────────
// HTTP request logger
app.use(morgan(config.server.nodeEnv === 'production' ? 'combined' : 'dev'));

// Parse JSON bodies
app.use(express.json());

// Parse URL-encoded bodies (form submissions)
app.use(express.urlencoded({ extended: true }));

// Serve static files from /public
app.use(express.static(path.join(__dirname, 'public')));

// ─── Routes ─────────────────────────────────────────────────────────────────
app.use('/', indexRouter);

// ─── 404 Handler ────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  res.status(404).render('error', {
    title: '404 – Page Not Found',
    message: 'The page you are looking for does not exist.',
    statusCode: 404,
  });
});

// ─── Global Error Handler ────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err.stack);

  const statusCode = err.status || err.statusCode || 500;
  const message =
    config.server.nodeEnv === 'production'
      ? 'An unexpected error occurred. Please try again later.'
      : err.message;

  res.status(statusCode).render('error', {
    title: `${statusCode} – Error`,
    message,
    statusCode,
  });
});

module.exports = app;