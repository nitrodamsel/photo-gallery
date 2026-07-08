'use strict';

const rateLimit = require('express-rate-limit');

const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // limit each key/IP to 100 requests per window
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use API key ID if available, otherwise fall back to IP
    return req.apiKey?.id ?? req.ip;
  },
  handler: (req, res) => {
    return res.status(429).json({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests, please try again later.',
      },
    });
  },
  skip: (req) => {
    // Skip rate limiting for non-API routes
    return !req.path.startsWith('/api/');
  },
});

module.exports = apiRateLimiter;