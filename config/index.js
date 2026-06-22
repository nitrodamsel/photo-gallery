'use strict';

/**
 * Centralised configuration built from process.env with defaults and basic validation.
 */

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function toInt(value, defaultValue) {
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? defaultValue : parsed;
}

const config = {
  // Server
  port: toInt(process.env.PORT, 3000),
  nodeEnv: process.env.NODE_ENV || 'development',

  // File uploads
  uploadDir: process.env.UPLOAD_DIR || 'uploads',
  maxFileSizeMb: toInt(process.env.MAX_FILE_SIZE_MB, 10),

  // Database
  dbPath: process.env.DB_PATH || './database.db',

  // Computed helpers
  get isProduction() {
    return this.nodeEnv === 'production';
  },
  get isDevelopment() {
    return this.nodeEnv === 'development';
  },
  get maxFileSizeBytes() {
    return this.maxFileSizeMb * 1024 * 1024;
  },
};

module.exports = config;