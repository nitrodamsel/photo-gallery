const express = require('express');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');

const app = express();

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layouts/base');

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
const indexRouter = require('./routes/index');
const uploadRouter = require('./routes/upload');

app.use('/', indexRouter);
app.use('/api/upload', uploadRouter);

// 404 handler
app.use((req, res, next) => {
  const err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// Error handler
app.use((err, req, res, next) => {
  const status = err.status || 500;
  const isDev = process.env.NODE_ENV !== 'production';

  if (req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'))) {
    return res.status(status).json({
      success: false,
      error: err.message || 'Internal Server Error',
      ...(isDev && { stack: err.stack }),
    });
  }

  res.status(status).render('error', {
    title: `Error ${status}`,
    message: err.message || 'Internal Server Error',
    status,
    stack: isDev ? err.stack : null,
  });
});

module.exports = app;