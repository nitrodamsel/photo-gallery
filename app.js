const express = require('express');
const path = require('path');
const morgan = require('morgan');

const app = express();

// ── View engine ──────────────────────────────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ── Middleware ───────────────────────────────────────────────────────────────
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Static files ─────────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Routes ───────────────────────────────────────────────────────────────────
const indexRouter = require('./routes/index');
const uploadRouter = require('./routes/upload');

app.use('/', indexRouter);
app.use('/api/upload', uploadRouter);

// ── Error handling ───────────────────────────────────────────────────────────
// 404 handler
app.use((req, res, next) => {
  const err = new Error(`Not Found: ${req.originalUrl}`);
  err.status = 404;
  next(err);
});

// Global error handler
app.use((err, req, res, next) => {
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';

  console.error(`[Error] ${status}: ${message}`, err.stack ? `\n${err.stack}` : '');

  // API errors → JSON
  if (req.path.startsWith('/api/') || req.headers.accept?.includes('application/json')) {
    return res.status(status).json({
      success: false,
      error: {
        message,
        code: err.code || 'INTERNAL_ERROR',
        status,
      },
    });
  }

  // HTML errors → error view
  res.status(status).render('error', {
    title: `Error ${status}`,
    status,
    message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : null,
  });
});

module.exports = app;