'use strict';

/**
 * Centralized application configuration.
 * Built from process.env with sensible defaults and basic validation.
 */

function requireEnv(key, defaultValue) {
  const value = process.env[key] ?? defaultValue;
  if (value === undefined || value === null || value === '') {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function parseIntEnv(key, defaultValue) {
  const raw = process.env[key];
  if (raw === undefined || raw === null) return defaultValue;
  const parsed = parseInt(raw, 10);
  if (isNaN(parsed)) {
    throw new Error(`Environment variable ${key} must be an integer, got: "${raw}"`);
  }
  return parsed;
}

const config = {
  // Server
  port: parseIntEnv('PORT', 3000),
  nodeEnv: requireEnv('NODE_ENV', 'development'),

  // File uploads
  uploadDir: requireEnv('UPLOAD_DIR', 'uploads'),
  maxFileSizeMb: parseIntEnv('MAX_FILE_SIZE_MB', 10),

  // Database
  dbPath: requireEnv('DB_PATH', './database.db'),

  // Derived helpers
  get isDevelopment() {
    return this.nodeEnv === 'development';
  },
  get isProduction() {
    return this.nodeEnv === 'production';
  },
  get maxFileSizeBytes() {
    return this.maxFileSizeMb * 1024 * 1024;
  },
};

module.exports = config;