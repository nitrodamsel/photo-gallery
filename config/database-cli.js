'use strict';

const path = require('path');

module.exports = {
  development: {
    dialect: 'sqlite',
    storage: path.join(__dirname, '..', 'database.sqlite'),
  },
  test: {
    dialect: 'sqlite',
    storage: path.join(__dirname, '..', 'database_test.sqlite'),
  },
  production: {
    dialect: 'sqlite',
    storage: process.env.DB_PATH || path.join(__dirname, '..', 'database.sqlite'),
  },
};