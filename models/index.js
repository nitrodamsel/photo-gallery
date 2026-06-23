'use strict';

const sequelize = require('../config/database');
const Image = require('./Image');
const Tag = require('./Tag');
const ImageTag = require('./ImageTag');
const ThumbnailCache = require('./ThumbnailCache');

// ── Associations ────────────────────────────────────────────────────────────

// Many-to-many: Image ↔ Tag through ImageTag
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

// Direct associations to the join table (useful for eager loading)
Image.hasMany(ImageTag, { foreignKey: 'imageId', as: 'ImageTags' });
ImageTag.belongsTo(Image, { foreignKey: 'imageId', as: 'Image' });

Tag.hasMany(ImageTag, { foreignKey: 'tagId', as: 'ImageTags' });
ImageTag.belongsTo(Tag, { foreignKey: 'tagId', as: 'Tag' });

// One-to-many: Image → ThumbnailCache
Image.hasMany(ThumbnailCache, { foreignKey: 'imageId', as: 'Thumbnails' });
ThumbnailCache.belongsTo(Image, { foreignKey: 'imageId', as: 'Image' });

// ── Sync helper (development only) ──────────────────────────────────────────

async function syncDatabase({ force = false, alter = false } = {}) {
  const env = process.env.NODE_ENV || 'development';
  if (env === 'development') {
    await sequelize.sync({ alter: alter || true, force });
    console.log('[DB] Models synchronized (alter mode).');
  } else {
    console.log('[DB] Skipping sync — rely on migrations in production.');
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