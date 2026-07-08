'use strict';

const { Sequelize } = require('sequelize');
const config = require('../config');

const sequelize = new Sequelize(
  config.database.database,
  config.database.username,
  config.database.password,
  {
    host: config.database.host,
    dialect: config.database.dialect,
    storage: config.database.storage,
    logging: config.database.logging,
  }
);

const db = {};

db.sequelize = sequelize;
db.Sequelize = Sequelize;

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