/**
 * Central error handling middleware.
 */
function errorHandler(err, req, res, next) {
  console.error('Error:', err.message);
  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }

  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  // Respond with JSON for API routes
  if (req.path.startsWith('/api/') || req.headers['accept'] === 'application/json') {
    return res.status(status).json({ error: message });
  }

  // Render error view for HTML routes
  try {
    return res.status(status).render('error', {
      title: `Error ${status}`,
      message,
      status,
    });
  } catch (renderErr) {
    return res.status(status).send(`<h1>Error ${status}</h1><p>${message}</p>`);
  }
}

module.exports = errorHandler;