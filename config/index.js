'use strict';

require('dotenv').config();

const config = {
  server: {
    port: parseInt(process.env.PORT, 10) || 3000,
    nodeEnv: process.env.NODE_ENV || 'development',
  },
  upload: {
    uploadDir: process.env.UPLOAD_DIR || 'uploads',
    maxFileSizeMB: parseInt(process.env.MAX_FILE_SIZE_MB, 10) || 10,
    get maxFileSizeBytes() {
      return this.maxFileSizeMB * 1024 * 1024;
    },
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  },
  database: {
    path: process.env.DB_PATH || './database.db',
  },
};

// Validation
function validateConfig(cfg) {
  const errors = [];

  if (isNaN(cfg.server.port) || cfg.server.port < 1 || cfg.server.port > 65535) {
    errors.push(`Invalid PORT: ${process.env.PORT}. Must be a number between 1 and 65535.`);
  }

  if (!['development', 'production', 'test'].includes(cfg.server.nodeEnv)) {
    errors.push(`Invalid NODE_ENV: ${cfg.server.nodeEnv}. Must be one of: development, production, test.`);
  }

  if (isNaN(cfg.upload.maxFileSizeMB) || cfg.upload.maxFileSizeMB < 1) {
    errors.push(`Invalid MAX_FILE_SIZE_MB: ${process.env.MAX_FILE_SIZE_MB}. Must be a positive number.`);
  }

  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }
}

validateConfig(config);

module.exports = config;