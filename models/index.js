'use strict';

const sequelize = require('../config/database');
const { Image, initImage } = require('./Image');
const { Tag, initTag } = require('./Tag');
const { ImageTag, initImageTag } = require('./ImageTag');
const { ThumbnailCache, initThumbnailCache } = require('./ThumbnailCache');

// Initialize all models
initImage(sequelize);
initTag(sequelize);
initImageTag(sequelize);
initThumbnailCache(sequelize);

// Set up associations
const models = { Image, Tag, ImageTag, ThumbnailCache };

Image.associate(models);
Tag.associate(models);
ImageTag.associate(models);
ThumbnailCache.associate(models);

/**
 * Sync database:
 * - In development: use alter:true to auto-apply changes
 * - In production: rely on migrations only
 */
async function syncDatabase() {
  const env = process.env.NODE_ENV || 'development';
  if (env === 'development') {
    await sequelize.sync({ alter: true });
    console.log('[DB] Database synced (alter: true) in development mode.');
  } else if (env === 'test') {
    await sequelize.sync({ force: true });
    console.log('[DB] Database synced (force: true) in test mode.');
  } else {
    // Production: do NOT auto-sync; use migrations
    console.log('[DB] Skipping auto-sync in production. Run migrations manually.');
  }
}

module.exports = {
  sequelize,
  syncDatabase,
  Image,
  Tag,
  ImageTag,
  ThumbnailCache,
};