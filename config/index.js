'use strict';

require('dotenv').config();

/**
 * Centralized application configuration.
 * Reads from process.env with sensible defaults and basic validation.
 */

const PORT = parseInt(process.env.PORT, 10) || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';
const MAX_FILE_SIZE_MB = parseFloat(process.env.MAX_FILE_SIZE_MB) || 10;
const DB_PATH = process.env.DB_PATH || './database.db';

// ── Validation ─────────────────────────────────────────────────────────────────
if (isNaN(PORT) || PORT < 1 || PORT > 65535) {
  throw new Error(`Invalid PORT value: "${process.env.PORT}". Must be a number between 1 and 65535.`);
}

if (!['development', 'production', 'test'].includes(NODE_ENV)) {
  console.warn(`Warning: Unrecognized NODE_ENV value "${NODE_ENV}". Expected development, production, or test.`);
}

if (isNaN(MAX_FILE_SIZE_MB) || MAX_FILE_SIZE_MB <= 0) {
  throw new Error(`Invalid MAX_FILE_SIZE_MB value: "${process.env.MAX_FILE_SIZE_MB}". Must be a positive number.`);
}

// ── Export ─────────────────────────────────────────────────────────────────────
const config = {
  port: PORT,
  nodeEnv: NODE_ENV,
  isDevelopment: NODE_ENV === 'development',
  isProduction: NODE_ENV === 'production',
  isTest: NODE_ENV === 'test',

  upload: {
    dir: UPLOAD_DIR,
    maxFileSizeBytes: MAX_FILE_SIZE_MB * 1024 * 1024,
    maxFileSizeMb: MAX_FILE_SIZE_MB,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
  },

  db: {
    path: DB_PATH,
    dialect: 'sqlite',
  },
};

module.exports = config;