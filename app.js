'use strict';

const express = require('express');
const morgan = require('morgan');
const path = require('path');

const indexRouter = require('./routes/index');

const app = express();

// ── View engine setup ────────────────────────────────────────────────────────
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// ── Logging ──────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// ── Body parsers ─────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Static files ─────────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// ── Routers ───────────────────────────────────────────────────────────────────
app.use('/', indexRouter);

// ── 404 handler ──────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  res.status(404).render('error', {
    title: '404 – Page Not Found',
    message: `The page you are looking for doesn't exist.`,
    status: 404,
  });
});

// ── Global error handler ─────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err.stack);
  const status = err.status || 500;
  res.status(status).render('error', {
    title: `${status} – Server Error`,
    message: process.env.NODE_ENV === 'production'
      ? 'Something went wrong. Please try again later.'
      : err.message,
    status,
  });
});

module.exports = app;