'use strict';

const express = require('express');
const morgan = require('morgan');
const path = require('path');

const config = require('./config');
const indexRouter = require('./routes/index');

const app = express();

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Logging middleware
app.use(morgan(config.isDevelopment ? 'dev' : 'combined'));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static file serving
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/', indexRouter);

// 404 handler
app.use((req, res, next) => {
  res.status(404).render('error', {
    title: '404 – Page Not Found',
    statusCode: 404,
    message: 'The page you are looking for does not exist.',
  });
});

// Global error handler
app.use((err, req, res, next) => {
  const statusCode = err.status || err.statusCode || 500;
  const message =
    config.isDevelopment ? err.message : 'An unexpected error occurred.';

  console.error('[Error]', err);

  res.status(statusCode).render('error', {
    title: `${statusCode} – Error`,
    statusCode,
    message,
  });
});

module.exports = app;