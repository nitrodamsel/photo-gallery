'use strict';

const { Sequelize } = require('sequelize');
const path = require('path');
const config = require('./index');

const dbPath = config.db.path || path.join(__dirname, '..', 'database.sqlite');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: dbPath,
  logging: config.env === 'development' ? console.log : false,
  define: {
    underscored: false,
    freezeTableName: false,
  },
});

module.exports = sequelize;