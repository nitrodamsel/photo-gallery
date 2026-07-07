'use strict';

const { Sequelize } = require('sequelize');
const config = require('../config');

const sequelize = new Sequelize(config.database);

const Image = require('./Image')(sequelize);
const Tag = require('./Tag')(sequelize);
const ImageTag = require('./ImageTag')(sequelize);
const ThumbnailCache = require('./ThumbnailCache')(sequelize);
const ApiKey = require('./ApiKey')(sequelize);

// Associations
Image.belongsToMany(Tag, { through: ImageTag, foreignKey: 'imageId', otherKey: 'tagId' });
Tag.belongsToMany(Image, { through: ImageTag, foreignKey: 'tagId', otherKey: 'imageId' });
Image.hasMany(ImageTag, { foreignKey: 'imageId' });
ImageTag.belongsTo(Image, { foreignKey: 'imageId' });
ImageTag.belongsTo(Tag, { foreignKey: 'tagId' });
Tag.hasMany(ImageTag, { foreignKey: 'tagId' });
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