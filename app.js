const express = require('express');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');

const app = express();

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// EJS layouts (if using express-ejs-layouts)
try {
  app.use(expressLayouts);
  app.set('layout', 'layouts/base');
} catch (e) {
  // express-ejs-layouts not available, skip
}

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
  const err = new Error('Page Not Found');
  err.status = 404;
  next(err);
});

// Error handler
app.use((err, req, res, next) => {
  const status = err.status || 500;
  console.error(`[${status}] ${err.message}`);
  if (err.stack && status >= 500) {
    console.error(err.stack);
  }

  // JSON response for API routes
  if (req.path.startsWith('/api/') || req.headers['x-requested-with'] === 'XMLHttpRequest') {
    return res.status(status).json({
      success: false,
      error: err.message || 'Internal Server Error',
      code: err.code || null,
    });
  }

  // HTML response
  res.status(status).render('error', {
    title: `Error ${status}`,
    status,
    message: err.message || 'Something went wrong.',
    stack: process.env.NODE_ENV === 'development' ? err.stack : null,
  });
});

module.exports = app;