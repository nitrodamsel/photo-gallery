'use strict';

const { ApiKey } = require('../models');

/**
 * API key authentication middleware.
 * Extracts Bearer token from Authorization header, validates against ApiKey model.
 * Only applies to /api routes.
 */
async function apiKeyAuth(req, res, next) {
  // Skip auth for non-/api routes
  if (!req.path.startsWith('/api') && !req.originalUrl.startsWith('/api')) {
    return next();
  }

  // Skip auth for docs routes
  if (req.originalUrl.startsWith('/api/docs')) {
    return next();
  }

  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(createAuthError('Missing or invalid Authorization header'));
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return next(createAuthError('Missing API key'));
  }

  try {
    const apiKey = await ApiKey.findOne({ where: { key: token } });
    if (!apiKey) {
      return next(createAuthError('Invalid API key'));
    }

    // Update lastUsedAt asynchronously (don't await to keep request fast)
    apiKey.touch().catch((err) => console.error('Failed to touch API key:', err));

    req.apiKey = apiKey;
    return next();
  } catch (err) {
    return next(err);
  }
}

function createAuthError(message) {
  const err = new Error(message);
  err.status = 401;
  err.code = 'UNAUTHORIZED';
  return err;
}

module.exports = apiKeyAuth;