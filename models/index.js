const { Sequelize } = require('sequelize');
const config = require('../config');

const sequelize = new Sequelize(config.database);

const Image = require('./Image')(sequelize);
const Tag = require('./Tag')(sequelize);
const ImageTag = require('./ImageTag')(sequelize);
const ThumbnailCache = require('./ThumbnailCache')(sequelize);

// Run associations
[Image, Tag, ImageTag, ThumbnailCache].forEach(model => {
  if (model.associate) {
    model.associate({ Image, Tag, ImageTag, ThumbnailCache });
  }
});

module.exports = {
  sequelize,
  Sequelize,
  Image,
  Tag,
  ImageTag,
  ThumbnailCache
};