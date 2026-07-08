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

const Image = require('./Image')(sequelize);
const Tag = require('./Tag')(sequelize);
const ImageTag = require('./ImageTag')(sequelize);
const ThumbnailCache = require('./ThumbnailCache')(sequelize);
const ApiKey = require('./ApiKey')(sequelize);

// Associations
Image.belongsToMany(Tag, { through: ImageTag, foreignKey: 'imageId', as: 'tags' });
Tag.belongsToMany(Image, { through: ImageTag, foreignKey: 'tagId', as: 'images' });
Image.hasMany(ImageTag, { foreignKey: 'imageId' });
ImageTag.belongsTo(Image, { foreignKey: 'imageId' });
Tag.hasMany(ImageTag, { foreignKey: 'tagId' });
ImageTag.belongsTo(Tag, { foreignKey: 'tagId' });

Image.hasMany(ThumbnailCache, { foreignKey: 'imageId', as: 'thumbnails' });
ThumbnailCache.belongsTo(Image, { foreignKey: 'imageId' });

module.exports = {
  sequelize,
  Sequelize,
  Image,
  Tag,
  ImageTag,
  ThumbnailCache,
  ApiKey,
};