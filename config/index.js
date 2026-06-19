'use strict';

require('dotenv').config();

const config = {
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  uploadDir: process.env.UPLOAD_DIR || 'uploads',
  maxFileSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB, 10) || 10,
  dbPath: process.env.DB_PATH || './data/gallery.db',

  get isDevelopment() {
    return this.nodeEnv === 'development';
  },

  get isProduction() {
    return this.nodeEnv === 'production';
  },

  get maxFileSizeBytes() {
    return this.maxFileSizeMb * 1024 * 1024;
  },

  validate() {
    const required = [];
    const errors = [];

    required.forEach((key) => {
      if (!this[key]) {
        errors.push(`Missing required config: ${key}`);
      }
    });

    if (isNaN(this.port) || this.port < 1 || this.port > 65535) {
      errors.push(`Invalid PORT value: ${process.env.PORT}`);
    }

    if (isNaN(this.maxFileSizeMb) || this.maxFileSizeMb < 1) {
      errors.push(`Invalid MAX_FILE_SIZE_MB value: ${process.env.MAX_FILE_SIZE_MB}`);
    }

    if (errors.length > 0) {
      throw new Error(`Configuration errors:\n${errors.join('\n')}`);
    }

    return this;
  },
};

config.validate();

module.exports = config;