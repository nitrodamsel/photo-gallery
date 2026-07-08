'use strict';

const { ApiKey } = require('../models');

/**
 * API Key authentication middleware.
 * Extracts Bearer token from Authorization header,
 * validates it against the ApiKey model, calls touch(),
 * and attaches the key to req.apiKey.
 *
 * Only applies to routes starting with /api/
 */
async function apiKeyAuth(req, res, next) {
  // Skip auth for non-/api routes
  if (!req.path.startsWith('/api/') && req.path !== '/api') {
    return next();
  }

  // Skip auth for docs endpoints
  if (req.path.startsWith('/api/docs')) {
    return next();
  }

  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    const err = new Error('Missing or invalid Authorization header. Use: Authorization: Bearer <key>');
    err.status = 401;
    err.code = 'UNAUTHORIZED';
    return next(err);
  }

  const token = authHeader.slice(7).trim();

  if (!token) {
    const err = new Error('API key is empty');
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

    // Update lastUsedAt asynchronously (don't await to avoid slowing down requests)
    apiKey.touch().catch((e) => console.error('Failed to touch API key:', e));

    req.apiKey = apiKey;
    return next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    const err = new Error('Authentication error');
    err.status = 500;
    err.code = 'INTERNAL_ERROR';
    return next(err);
  }
}

module.exports = apiKeyAuth;