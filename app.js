'use strict';

const express = require('express');
const morgan = require('morgan');
const path = require('path');

const indexRouter = require('./routes/index');

const app = express();

// ─── View Engine ───────────────────────────────────────────────────────────────
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// ─── Middleware ─────────────────────────────────────────────────────────────────
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ─── Routes ─────────────────────────────────────────────────────────────────────
app.use('/', indexRouter);

// ─── 404 Handler ────────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  const err = new Error(`Not Found: ${req.originalUrl}`);
  err.status = 404;
  next(err);
});

// ─── Global Error Handler ────────────────────────────────────────────────────────
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  const status = err.status || 500;
  res.status(status);

  if (req.accepts('html')) {
    res.render('error', {
      title: `Error ${status}`,
      message: err.message,
      status,
      stack: process.env.NODE_ENV !== 'production' ? err.stack : null,
    });
  } else {
    res.json({ error: { status, message: err.message } });
  }
});

module.exports = app;