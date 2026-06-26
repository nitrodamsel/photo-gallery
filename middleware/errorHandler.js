/**
 * Express error-handling middleware (4 args).
 * Logs the error, then renders 404/500 or returns JSON depending on Accept header.
 */
function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  // Log the error (skip 404s to keep logs clean)
  if (status >= 500) {
    console.error(`[ERROR] ${req.method} ${req.url} — ${status}: ${message}`);
    if (err.stack) console.error(err.stack);
  } else {
    console.warn(`[WARN] ${req.method} ${req.url} — ${status}: ${message}`);
  }

  res.status(status);

  // JSON response for API/XHR clients
  if (req.accepts('json') && !req.accepts('html')) {
    return res.json({ error: message, status });
  }

  // HTML response
  if (status === 404) {
    return res.render('404', { title: 'Page Not Found', message });
  }

  return res.render('error', {
    title: 'Error',
    message,
    status,
    stack: process.env.NODE_ENV !== 'production' ? err.stack : null,
  });
}

module.exports = errorHandler;