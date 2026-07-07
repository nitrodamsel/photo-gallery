'use strict';

const { ApiKey } = require('../models');

/**
 * API key authentication middleware.
 * Extracts Bearer token from Authorization header, validates against ApiKey model,
 * calls key.touch(), and attaches key to req.apiKey.
 * Only applies to routes starting with /api.
 */
async function apiKeyAuth(req, res, next) {
  // Skip auth for non-/api routes
  if (!req.path.startsWith('/api') && !req.originalUrl.startsWith('/api')) {
    return next();
  }

  // Skip auth for docs endpoints
  if (req.originalUrl.startsWith('/api/docs')) {
    return next();
  }

  const authHeader = req.headers['authorization'] || req.headers['Authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(createAuthError());
  }

  const token = authHeader.slice(7).trim();

  if (!token) {
    return next(createAuthError());
  }

  try {
    const apiKey = await ApiKey.findOne({ where: { key: token } });

    if (!apiKey) {
      return next(createAuthError());
    }

    // Update lastUsedAt asynchronously — don't block the request
    apiKey.touch().catch((err) => {
      console.error('Failed to update lastUsedAt for API key:', err);
    });

    req.apiKey = apiKey;
    return next();
  } catch (err) {
    return next(err);
  }
}

function createAuthError() {
  const err = new Error('Invalid or missing API key');
  err.status = 401;
  err.code = 'UNAUTHORIZED';
  return err;
}

module.exports = apiKeyAuth;