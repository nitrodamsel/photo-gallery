'use strict';

const { Sequelize } = require('sequelize');
const path = require('path');
const config = require('./index');

const dbPath = config.dbPath || process.env.DB_PATH || path.join(__dirname, '..', 'data', 'database.sqlite');
const isDevelopment = (config.env || process.env.NODE_ENV || 'development') === 'development';

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: dbPath,
  logging: isDevelopment ? console.log : false,
  define: {
    underscored: false,
    freezeTableName: false,
  },
});

module.exports = sequelize;