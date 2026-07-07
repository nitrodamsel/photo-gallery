'use strict';

const { sequelize } = require('../config/database');
const Image = require('./Image')(sequelize);
const Tag = require('./Tag')(sequelize);
const ImageTag = require('./ImageTag')(sequelize);
const ThumbnailCache = require('./ThumbnailCache')(sequelize);
const ApiKey = require('./ApiKey')(sequelize);

// Set up associations
Image.belongsToMany(Tag, {
  through: ImageTag,
  foreignKey: 'imageId',
  otherKey: 'tagId',
  as: 'tags',
});

Tag.belongsToMany(Image, {
  through: ImageTag,
  foreignKey: 'tagId',
  otherKey: 'imageId',
  as: 'images',
});

Image.hasMany(ThumbnailCache, {
  foreignKey: 'imageId',
  as: 'thumbnailCaches',
});

ThumbnailCache.belongsTo(Image, {
  foreignKey: 'imageId',
  as: 'image',
});

module.exports = {
  sequelize,
  Image,
  Tag,
  ImageTag,
  ThumbnailCache,
  ApiKey,
};