'use strict';

const path = require('path');

const env = process.env.NODE_ENV || 'development';

const config = {
  env,
  port: parseInt(process.env.PORT, 10) || 3000,
  db: {
    path: process.env.DB_PATH || path.join(__dirname, '..', 'database.sqlite'),
  },
  uploads: {
    dir: process.env.UPLOADS_DIR || path.join(__dirname, '..', 'uploads'),
    maxSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 10 * 1024 * 1024, // 10MB
  },
  thumbnails: {
    dir: process.env.THUMBNAILS_DIR || path.join(__dirname, '..', 'uploads', 'thumbnails'),
    sizes: [150, 300, 600],
  },
};

module.exports = config;