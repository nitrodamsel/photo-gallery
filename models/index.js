const { Sequelize } = require('sequelize');
const config = require('../config');

const sequelize = new Sequelize(
  config.database.database,
  config.database.username,
  config.database.password,
  {
    dialect: config.database.dialect || 'sqlite',
    storage: config.database.storage,
    logging: config.database.logging !== undefined ? config.database.logging : false,
    define: {
      underscored: false,
    },
  }
);

// Import models
const Image = require('./Image')(sequelize);
const Tag = require('./Tag')(sequelize);
const ImageTag = require('./ImageTag')(sequelize);
const ThumbnailCache = require('./ThumbnailCache')(sequelize);

const models = { Image, Tag, ImageTag, ThumbnailCache, sequelize, Sequelize };

// Run associations
Object.values(models).forEach((model) => {
  if (model && typeof model.associate === 'function') {
    model.associate(models);
  }
});

module.exports = models;