'use strict';

const sequelize = require('../config/database');
const Image = require('./Image');
const Tag = require('./Tag');
const ImageTag = require('./ImageTag');
const ThumbnailCache = require('./ThumbnailCache');
const config = require('../config');

// ─── Associations ────────────────────────────────────────────────────────────

// Image <-> Tag many-to-many through ImageTag
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

// ThumbnailCache belongs to Image
ThumbnailCache.belongsTo(Image, {
  foreignKey: 'imageId',
  as: 'image',
  onDelete: 'CASCADE',
});

Image.hasMany(ThumbnailCache, {
  foreignKey: 'imageId',
  as: 'thumbnails',
});

// ─── Sync (development only) ─────────────────────────────────────────────────

async function syncDatabase() {
  if (config.env === 'development') {
    await sequelize.sync({ alter: true });
    console.log('[DB] Database synced (alter: true)');
  }
}

module.exports = {
  sequelize,
  Image,
  Tag,
  ImageTag,
  ThumbnailCache,
  syncDatabase,
};