'use strict';
const { Sequelize, DataTypes } = require('sequelize');
const config = require('../config/index');

const dbConfig = config.database;

let sequelize;
if (dbConfig.dialect === 'sqlite') {
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: dbConfig.storage,
    logging: dbConfig.logging || false
  });
} else {
  sequelize = new Sequelize(dbConfig.database, dbConfig.username, dbConfig.password, {
    host: dbConfig.host,
    dialect: dbConfig.dialect,
    logging: dbConfig.logging || false
  });
}

// Import models
const Image = require('./Image')(sequelize, DataTypes);
const Tag = require('./Tag')(sequelize, DataTypes);
const ImageTag = require('./ImageTag')(sequelize, DataTypes);
const ThumbnailCache = require('./ThumbnailCache')(sequelize, DataTypes);

const models = { Image, Tag, ImageTag, ThumbnailCache };

// Run associations
Object.values(models).forEach(model => {
  if (typeof model.associate === 'function') {
    model.associate(models);
  }
});

module.exports = {
  sequelize,
  Sequelize,
  Image,
  Tag,
  ImageTag,
  ThumbnailCache
};