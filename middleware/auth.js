'use strict';

const { ApiKey } = require('../models');

/**
 * API key authentication middleware.
 * Checks Authorization: Bearer <key> header for /api/* routes.
 * Skips authentication for non-/api routes.
 */
async function apiKeyAuth(req, res, next) {
  // Only protect /api routes
  if (!req.path.startsWith('/api')) {
    return next();
  }

  // Skip auth for docs endpoints
  if (req.path.startsWith('/api/docs')) {
    return next();
  }

  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(
      Object.assign(new Error('Missing or invalid Authorization header'), {
        status: 401,
        code: 'UNAUTHORIZED',
      })
    );
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return next(
      Object.assign(new Error('Missing API key'), {
        status: 401,
        code: 'UNAUTHORIZED',
      })
    );
  }

  try {
    const apiKey = await ApiKey.findOne({ where: { key: token } });
    if (!apiKey) {
      return next(
        Object.assign(new Error('Invalid API key'), {
          status: 401,
          code: 'INVALID_API_KEY',
        })
      );
    }

    // Update lastUsedAt asynchronously — don't block the request
    apiKey.touch().catch((err) => console.error('Failed to update lastUsedAt:', err));

    req.apiKey = apiKey;
    return next();
  } catch (err) {
    return next(err);
  }
}

module.exports = apiKeyAuth;