const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ThumbnailCache = sequelize.define('ThumbnailCache', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    imageId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'images', key: 'id' },
    },
    size: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    filePath: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    width: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    height: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    format: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: 'webp',
    },
  }, {
    tableName: 'thumbnail_cache',
    timestamps: true,
  });

  ThumbnailCache.associate = (models) => {
    ThumbnailCache.belongsTo(models.Image, {
      foreignKey: 'imageId',
      as: 'Image',
    });
  };

  return ThumbnailCache;
};