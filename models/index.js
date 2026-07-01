const { Sequelize } = require('sequelize');
const config = require('../config');

const sequelize = new Sequelize(config.database);

// Import models
const Image = require('./Image')(sequelize);
const Tag = require('./Tag')(sequelize);
const ImageTag = require('./ImageTag')(sequelize);
const ThumbnailCache = require('./ThumbnailCache')(sequelize);

// Associations
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

Tag.hasMany(ImageTag, {
  foreignKey: 'tagId',
  as: 'imageTags',
});

ImageTag.belongsTo(Tag, {
  foreignKey: 'tagId',
});

ImageTag.belongsTo(Image, {
  foreignKey: 'imageId',
});

Image.hasMany(ThumbnailCache, {
  foreignKey: 'imageId',
  as: 'thumbnails',
});

ThumbnailCache.belongsTo(Image, {
  foreignKey: 'imageId',
});

module.exports = {
  sequelize,
  Sequelize,
  Image,
  Tag,
  ImageTag,
  ThumbnailCache,
};