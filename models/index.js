'use strict';

const { Sequelize } = require('sequelize');
const config = require('../config');

const sequelize = new Sequelize(
  config.database.database,
  config.database.username,
  config.database.password,
  {
    host: config.database.host,
    port: config.database.port,
    dialect: config.database.dialect,
    logging: config.database.logging,
    pool: config.database.pool,
  }
);

const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

// Import models
db.Image = require('./Image')(sequelize);
db.Tag = require('./Tag')(sequelize);
db.ImageTag = require('./ImageTag')(sequelize);
db.ThumbnailCache = require('./ThumbnailCache')(sequelize);
db.ApiKey = require('./ApiKey')(sequelize);

// Run associations
Object.values(db).forEach((model) => {
  if (model && typeof model.associate === 'function') {
    model.associate(db);
  }
});

module.exports = db;