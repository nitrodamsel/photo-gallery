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
  foreignKey: 'image_id',
  otherKey: 'tag_id',
  as: 'tags',
});

Tag.belongsToMany(Image, {
  through: ImageTag,
  foreignKey: 'tag_id',
  otherKey: 'image_id',
  as: 'images',
});

Image.hasMany(ThumbnailCache, {
  foreignKey: 'imageId',
  as: 'thumbnails',
});

ThumbnailCache.belongsTo(Image, {
  foreignKey: 'imageId',
  as: 'image',
});

module.exports = {
  sequelize,
  Sequelize,
  Image,
  Tag,
  ImageTag,
  ThumbnailCache,
};