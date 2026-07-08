'use strict';

/**
 * Global error handler middleware.
 * Formats errors as JSON for API routes, renders error page for web routes.
 */
function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;
  const code = err.code || (status === 404 ? 'NOT_FOUND' : status === 401 ? 'UNAUTHORIZED' : 'INTERNAL_ERROR');
  const message = err.message || 'An unexpected error occurred';

  // Log server errors
  if (status >= 500) {
    console.error('[Error]', err);
  }

  // JSON response for API routes
  if (req.path.startsWith('/api/') || req.xhr || req.headers.accept?.includes('application/json')) {
    return res.status(status).json({
      error: {
        code,
        message,
      },
    });
  }

  // HTML response for web routes
  if (status === 404) {
    return res.status(404).render('404', { title: 'Page Not Found', message });
  }

  return res.status(status).render('error', {
    title: 'Error',
    status,
    message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : null,
  });
}

module.exports = errorHandler;