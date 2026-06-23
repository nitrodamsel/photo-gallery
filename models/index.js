'use strict';

const sequelize = require('../config/database');
const Image = require('./Image');
const Tag = require('./Tag');
const ImageTag = require('./ImageTag');
const ThumbnailCache = require('./ThumbnailCache');

// Associations
Image.belongsToMany(Tag, {
  through: ImageTag,
  foreignKey: 'imageId',
  otherKey: 'tagId',
  as: 'Tags',
});

Tag.belongsToMany(Image, {
  through: ImageTag,
  foreignKey: 'tagId',
  otherKey: 'imageId',
  as: 'Images',
});

Image.hasMany(ThumbnailCache, {
  foreignKey: 'imageId',
  as: 'Thumbnails',
  onDelete: 'CASCADE',
});

ThumbnailCache.belongsTo(Image, {
  foreignKey: 'imageId',
  as: 'Image',
});

ImageTag.belongsTo(Image, { foreignKey: 'imageId' });
ImageTag.belongsTo(Tag, { foreignKey: 'tagId' });

const db = {
  sequelize,
  Image,
  Tag,
  ImageTag,
  ThumbnailCache,
};

module.exports = db;