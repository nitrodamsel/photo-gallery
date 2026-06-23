'use strict';

const path = require('path');

const env = process.env.NODE_ENV || 'development';

module.exports = {
  env,
  port: process.env.PORT || 3000,
  dbPath: process.env.DB_PATH || path.join(__dirname, '..', 'data', 'database.sqlite'),
  uploadsDir: process.env.UPLOADS_DIR || path.join(__dirname, '..', 'uploads'),
  isDevelopment: env === 'development',
  isProduction: env === 'production',
};