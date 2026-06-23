'use strict';

const path = require('path');

// This file is used by sequelize-cli
module.exports = {
  development: {
    dialect: 'sqlite',
    storage: process.env.DB_PATH || path.join(__dirname, '..', 'database.sqlite'),
  },
  test: {
    dialect: 'sqlite',
    storage: process.env.DB_PATH || path.join(__dirname, '..', 'database.test.sqlite'),
  },
  production: {
    dialect: 'sqlite',
    storage: process.env.DB_PATH || path.join(__dirname, '..', 'database.sqlite'),
  },
};