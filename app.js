'use strict';

const express = require('express');
const morgan = require('morgan');
const path = require('path');

const indexRouter = require('./routes/index');

const app = express();

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/', indexRouter);

// 404 handler
app.use((req, res, next) => {
  const err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// Error handler
app.use((err, req, res, next) => {
  const status = err.status || 500;
  res.status(status);
  res.render('error', {
    title: `Error ${status}`,
    message: err.message,
    status,
    stack: process.env.NODE_ENV !== 'production' ? err.stack : null,
  });
});

module.exports = app;