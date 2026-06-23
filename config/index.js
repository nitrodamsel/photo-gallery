'use strict';

const path = require('path');

const env = process.env.NODE_ENV || 'development';

module.exports = {
  env,
  port: parseInt(process.env.PORT, 10) || 3000,
  dbPath: process.env.DB_PATH || path.join(__dirname, '..', 'data', 'database.sqlite'),
  uploadDir: process.env.UPLOAD_DIR || path.join(__dirname, '..', 'uploads'),
  isDevelopment: env === 'development',
  isProduction: env === 'production',
};