'use strict';

/**
 * Express 404 handler — call next(err) with status 404 or use this as a catch-all
 */
function notFoundHandler(req, res, next) {
  const err = new Error(`Not Found: ${req.originalUrl}`);
  err.status = 404;
  next(err);
}

/**
 * Express error-handling middleware (must have 4 args)
 */
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  // Log the error
  console.error(`[${new Date().toISOString()}] Error ${err.status || 500}:`, err.message);
  if (process.env.NODE_ENV !== 'production') {
    console.error(err.stack);
  }

  const status = err.status || err.statusCode || 500;
  res.status(status);

  // Respond with JSON if the client prefers it
  if (req.headers.accept && req.headers.accept.includes('application/json')) {
    return res.json({
      error: {
        status,
        message: err.message || 'An unexpected error occurred',
      },
    });
  }

  // Render appropriate view
  if (status === 404) {
    return res.render('404', {
      title: '404 — Page Not Found',
      message: err.message || 'The page you are looking for could not be found.',
    });
  }

  return res.render('error', {
    title: `Error ${status}`,
    status,
    message: process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred. Please try again later.'
      : err.message,
    stack: process.env.NODE_ENV !== 'production' ? err.stack : null,
  });
}

module.exports = { notFoundHandler, errorHandler };