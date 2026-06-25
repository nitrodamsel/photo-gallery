const { Sequelize } = require('sequelize');
const config = require('../config');

const sequelize = new Sequelize(config.database);

const Image = require('./Image')(sequelize);
const Tag = require('./Tag')(sequelize);
const ImageTag = require('./ImageTag')(sequelize);
const ThumbnailCache = require('./ThumbnailCache')(sequelize);

// Run associations
const models = { Image, Tag, ImageTag, ThumbnailCache };
Object.values(models).forEach((model) => {
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
  ThumbnailCache,
};