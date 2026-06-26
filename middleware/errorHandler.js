/**
 * Express error-handling middleware.
 * Must have exactly 4 arguments to be recognized by Express as an error handler.
 */
function errorHandler(err, req, res, next) {
  // Log the error
  console.error('[Error]', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    status: err.status || err.statusCode || 500,
  });

  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  // Respond with JSON if the client expects JSON
  if (req.accepts('json') && !req.accepts('html')) {
    return res.status(status).json({
      error: {
        status,
        message,
      },
    });
  }

  // Render appropriate view
  if (status === 404) {
    return res.status(404).render('404', {
      title: 'Not Found',
      message,
    });
  }

  return res.status(status).render('error', {
    title: 'Error',
    status,
    message,
    error: process.env.NODE_ENV !== 'production' ? err : null,
  });
}

/**
 * 404 handler for unmatched routes.
 */
function notFoundHandler(req, res, next) {
  const err = new Error(`Not Found: ${req.originalUrl}`);
  err.status = 404;
  next(err);
}

module.exports = { errorHandler, notFoundHandler };