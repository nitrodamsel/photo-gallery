const express = require('express');
const path = require('path');
const morgan = require('morgan');

const app = express();

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files — serve uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/', require('./routes/index'));
app.use('/api/upload', require('./routes/upload'));

// 404 handler
app.use((req, res, next) => {
  res.status(404).render('error', {
    title: '404 Not Found',
    message: 'The page you are looking for does not exist.',
    status: 404,
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[app] Error:', err.message);

  const status = err.status || 500;
  const isApi = req.path.startsWith('/api/');

  if (isApi) {
    return res.status(status).json({
      error: err.message || 'Internal server error',
      code: err.code || 'SERVER_ERROR',
    });
  }

  res.status(status).render('error', {
    title: `${status} Error`,
    message: err.message || 'An unexpected error occurred.',
    status,
  });
});

module.exports = app;