'use strict';

const rateLimit = require('express-rate-limit');

/**
 * Rate limiter for API endpoints.
 * Limits to 100 requests per minute per API key (or IP if no key).
 */
const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false,  // Disable the `X-RateLimit-*` headers
  keyGenerator: (req) => {
    // Use API key ID if available, otherwise fall back to IP
    return req.apiKey?.id ?? req.ip;
  },
  handler: (req, res) => {
    res.status(429).json({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Limit is 100 requests per minute.',
        retryAfter: Math.ceil(req.rateLimit?.resetTime ? (req.rateLimit.resetTime - Date.now()) / 1000 : 60),
      },
    });
  },
  skip: (req) => {
    // Skip rate limiting for docs
    return req.path.startsWith('/api/docs');
  },
});

module.exports = apiRateLimiter;