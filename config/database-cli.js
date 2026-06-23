'use strict';

const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'database.sqlite');

module.exports = {
  development: {
    dialect: 'sqlite',
    storage: dbPath,
    logging: true,
  },
  test: {
    dialect: 'sqlite',
    storage: ':memory:',
    logging: false,
  },
  production: {
    dialect: 'sqlite',
    storage: dbPath,
    logging: false,
  },
};