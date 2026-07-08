'use strict';

const { ApiKey } = require('../models');

/**
 * API Key authentication middleware.
 * Extracts Bearer token from Authorization header,
 * validates against ApiKey model, and attaches key to req.apiKey.
 * Only applies to routes under /api/.
 */
async function apiKeyAuth(req, res, next) {
  // Skip auth for non-/api routes
  if (!req.path.startsWith('/api/') && req.path !== '/api') {
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
        message: 'Missing or invalid Authorization header. Use: Authorization: Bearer <api_key>',
      },
    });
  }

  const token = authHeader.slice(7).trim();

  if (!token) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'API key is empty.',
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

    // Attach key to request and update lastUsedAt asynchronously
    req.apiKey = apiKey;
    apiKey.touch().catch((err) => {
      console.error('Failed to update lastUsedAt for API key:', err);
    });

    return next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Authentication service error.',
      },
    });
  }
}

module.exports = apiKeyAuth;