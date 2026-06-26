/**
 * Express error-handling middleware
 * Must have 4 arguments to be recognized as error handler by Express
 */
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  // Log the error
  console.error('[ErrorHandler]', err.message || err);
  if (process.env.NODE_ENV !== 'production') {
    console.error(err.stack);
  }

  const status = err.status || err.statusCode || 500;
  const message = err.message || 'An unexpected error occurred';

  // Respond based on Accept header
  const wantsJson = req.headers.accept && req.headers.accept.includes('application/json');

  if (wantsJson) {
    return res.status(status).json({
      error: {
        status,
        message: process.env.NODE_ENV === 'production' && status === 500
          ? 'Internal Server Error'
          : message,
      },
    });
  }

  // Render appropriate view
  if (status === 404) {
    return res.status(404).render('404', {
      title: '404 — Not Found',
    });
  }

  // Generic error view
  return res.status(status).render('error', {
    title: `${status} — Error`,
    status,
    message: process.env.NODE_ENV === 'production' && status === 500
      ? 'An unexpected error occurred. Please try again later.'
      : message,
    stack: process.env.NODE_ENV !== 'production' ? err.stack : null,
  });
}

/**
 * 404 handler — call this before the error handler for unmatched routes
 */
function notFoundHandler(req, res) {
  const wantsJson = req.headers.accept && req.headers.accept.includes('application/json');
  if (wantsJson) {
    return res.status(404).json({ error: { status: 404, message: 'Not Found' } });
  }
  return res.status(404).render('404', { title: '404 — Not Found' });
}

module.exports = { errorHandler, notFoundHandler };