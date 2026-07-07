'use strict';

const rateLimit = require('express-rate-limit');

/**
 * Rate limiter for API routes.
 * Limits to 100 requests per minute per API key (or IP if no key).
 */
const rateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.apiKey?.id ?? req.ip,
  handler: (req, res) => {
    res.status(429).json({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Limit: 100 requests per minute.',
        retryAfter: Math.ceil(req.rateLimit?.resetTime ? (req.rateLimit.resetTime - Date.now()) / 1000 : 60),
      },
    });
  },
  skip: (req) => {
    // Skip rate limiting for docs
    return req.originalUrl.startsWith('/api/docs');
  },
});

module.exports = rateLimiter;