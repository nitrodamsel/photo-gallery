'use strict';

const path = require('path');

const env = process.env.NODE_ENV || 'development';

const config = {
  development: {
    env: 'development',
    port: process.env.PORT || 3000,
    dbPath: process.env.DB_PATH || path.join(__dirname, '..', 'database.sqlite'),
    uploadsDir: path.join(__dirname, '..', 'uploads'),
  },
  production: {
    env: 'production',
    port: process.env.PORT || 3000,
    dbPath: process.env.DB_PATH || path.join(__dirname, '..', 'database.sqlite'),
    uploadsDir: path.join(__dirname, '..', 'uploads'),
  },
  test: {
    env: 'test',
    port: process.env.PORT || 3001,
    dbPath: process.env.DB_PATH || path.join(__dirname, '..', 'database.test.sqlite'),
    uploadsDir: path.join(__dirname, '..', 'uploads'),
  },
};

module.exports = config[env];