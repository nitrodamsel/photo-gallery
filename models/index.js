const { Sequelize } = require('sequelize');
const config = require('../config');

const sequelize = new Sequelize(
  config.database.database,
  config.database.username,
  config.database.password,
  {
    host: config.database.host,
    port: config.database.port,
    dialect: config.database.dialect,
    logging: config.database.logging,
    pool: config.database.pool
  }
);

const db = {};

db.sequelize = sequelize;
db.Sequelize = Sequelize;

// Load models
db.Image = require('./Image')(sequelize);
db.Tag = require('./Tag')(sequelize);
db.ImageTag = require('./ImageTag')(sequelize);
db.ThumbnailCache = require('./ThumbnailCache')(sequelize);

// Run associations
Object.keys(db).forEach(modelName => {
  if (db[modelName] && db[modelName].associate) {
    db[modelName].associate(db);
  }
});

module.exports = db;