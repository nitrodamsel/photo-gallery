'use strict';

const { ApiKey } = require('../models');

/**
 * API Key authentication middleware.
 * Extracts Bearer token from Authorization header,
 * validates against ApiKey model, calls touch(), attaches to req.apiKey.
 * Only applies to routes starting with /api.
 */
async function apiKeyAuth(req, res, next) {
  // Skip auth for non-/api routes
  if (!req.path.startsWith('/api')) {
    return next();
  }

  // Skip auth for docs routes
  if (req.path.startsWith('/api/docs')) {
    return next();
  }

  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Missing or invalid Authorization header. Use: Authorization: Bearer <key>',
      },
    });
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Bearer token is empty.',
      },
    });
  }

  try {
    const apiKey = await ApiKey.findOne({ where: { key: token } });
    if (!apiKey) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid API key.',
        },
      });
    }

    // Update lastUsedAt asynchronously (don't block the request)
    apiKey.touch().catch((err) => console.error('Failed to touch API key:', err));

    req.apiKey = apiKey;
    return next();
  } catch (err) {
    return next(err);
  }
}

module.exports = apiKeyAuth;