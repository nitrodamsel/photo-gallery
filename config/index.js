'use strict';

require('dotenv').config();

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,
  uploadDir: process.env.UPLOAD_DIR || 'uploads',
  maxFileSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB, 10) || 10,
  dbPath: process.env.DB_PATH || './database.db',

  get maxFileSizeBytes() {
    return this.maxFileSizeMb * 1024 * 1024;
  },

  get isDevelopment() {
    return this.env === 'development';
  },

  get isProduction() {
    return this.env === 'production';
  },
};

// ── Basic validation ─────────────────────────────────────────────────────────
if (isNaN(config.port) || config.port < 1 || config.port > 65535) {
  throw new Error(`Invalid PORT value: "${process.env.PORT}". Must be a number between 1 and 65535.`);
}

if (isNaN(config.maxFileSizeMb) || config.maxFileSizeMb <= 0) {
  throw new Error(`Invalid MAX_FILE_SIZE_MB value: "${process.env.MAX_FILE_SIZE_MB}". Must be a positive number.`);
}

module.exports = config;