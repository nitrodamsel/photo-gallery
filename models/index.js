const { Sequelize } = require('sequelize');
const config = require('../config');

const sequelize = new Sequelize(config.database.url, {
  dialect: config.database.dialect || 'sqlite',
  storage: config.database.storage,
  logging: config.database.logging || false,
});

const db = {};

// Import models
db.Image = require('./Image')(sequelize);
db.Tag = require('./Tag')(sequelize);
db.ImageTag = require('./ImageTag')(sequelize);
db.ThumbnailCache = require('./ThumbnailCache')(sequelize);

// Run associations
Object.values(db).forEach((model) => {
  if (model.associate) {
    model.associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;