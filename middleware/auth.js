'use strict';

const { ApiKey } = require('../models');

/**
 * API Key authentication middleware.
 * Extracts Bearer token from Authorization header,
 * validates against ApiKey model, and attaches to req.apiKey.
 * Only applies to routes starting with /api.
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

    // Update lastUsedAt asynchronously (don't await to avoid blocking)
    apiKey.touch().catch((err) => console.error('Failed to update lastUsedAt:', err));

    req.apiKey = apiKey;
    next();
  } catch (err) {
    next(err);
  }
}

function createAuthError(message) {
  const err = new Error(message);
  err.status = 401;
  err.code = 'UNAUTHORIZED';
  return err;
}

module.exports = apiKeyAuth;