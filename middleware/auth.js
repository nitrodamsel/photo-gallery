'use strict';

const { ApiKey } = require('../models');

/**
 * API Key authentication middleware.
 * Validates Bearer token from Authorization header against ApiKey model.
 * Only applies to routes starting with /api/
 */
const auth = async (req, res, next) => {
  // Skip auth for non-/api routes
  if (!req.path.startsWith('/api/') && !req.originalUrl.startsWith('/api/')) {
    return next();
  }

  // Skip auth for docs endpoints
  if (req.originalUrl.startsWith('/api/docs')) {
    return next();
  }

  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    const err = new Error('Missing or invalid Authorization header. Use: Authorization: Bearer <api_key>');
    err.status = 401;
    err.code = 'UNAUTHORIZED';
    return next(err);
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    const err = new Error('Bearer token is empty');
    err.status = 401;
    err.code = 'UNAUTHORIZED';
    return next(err);
  }

  try {
    const apiKey = await ApiKey.findOne({ where: { key: token } });
    if (!apiKey) {
      const err = new Error('Invalid API key');
      err.status = 401;
      err.code = 'UNAUTHORIZED';
      return next(err);
    }

    // Update lastUsedAt asynchronously (don't await to avoid slowing requests)
    apiKey.touch().catch(e => console.error('Error updating lastUsedAt:', e));

    req.apiKey = apiKey;
    return next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    err.status = 500;
    err.code = 'INTERNAL_ERROR';
    return next(err);
  }
};

module.exports = auth;