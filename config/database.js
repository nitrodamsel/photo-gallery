'use strict';

const { Sequelize } = require('sequelize');
const path = require('path');

// Load config
const env = process.env.NODE_ENV || 'development';
const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'database.sqlite');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: dbPath,
  logging: env === 'development' ? console.log : false,
  define: {
    underscored: false,
    freezeTableName: false,
  },
});

module.exports = sequelize;