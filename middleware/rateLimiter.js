'use strict';

const rateLimit = require('express-rate-limit');

const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.apiKey?.id ?? req.ip,
  handler: (req, res) => {
    res.status(429).json({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please slow down and try again in a minute.',
      },
    });
  },
  skip: (req) => {
    // Skip rate limiting for docs
    return req.originalUrl.startsWith('/api/docs');
  },
});

module.exports = apiRateLimiter;