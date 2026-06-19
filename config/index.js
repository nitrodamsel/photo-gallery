'use strict';

require('dotenv').config();

const config = {
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  uploadDir: process.env.UPLOAD_DIR || 'uploads',
  maxFileSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB, 10) || 10,
  dbPath: process.env.DB_PATH || './database.db',

  get isDevelopment() {
    return this.nodeEnv === 'development';
  },

  get isProduction() {
    return this.nodeEnv === 'production';
  },

  get maxFileSizeBytes() {
    return this.maxFileSizeMb * 1024 * 1024;
  }
};

// Validation
function validateConfig(cfg) {
  const errors = [];

  if (isNaN(cfg.port) || cfg.port < 1 || cfg.port > 65535) {
    errors.push(`Invalid PORT: "${process.env.PORT}". Must be a number between 1 and 65535.`);
  }

  if (!['development', 'production', 'test'].includes(cfg.nodeEnv)) {
    errors.push(`Invalid NODE_ENV: "${cfg.nodeEnv}". Must be one of: development, production, test.`);
  }

  if (isNaN(cfg.maxFileSizeMb) || cfg.maxFileSizeMb <= 0) {
    errors.push(`Invalid MAX_FILE_SIZE_MB: "${process.env.MAX_FILE_SIZE_MB}". Must be a positive number.`);
  }

  if (errors.length > 0) {
    console.error('❌ Configuration errors:');
    errors.forEach(e => console.error(`   - ${e}`));
    process.exit(1);
  }
}

validateConfig(config);

module.exports = config;