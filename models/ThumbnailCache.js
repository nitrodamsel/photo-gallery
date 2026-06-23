'use strict';

const { DataTypes, Model } = require('sequelize');

class ThumbnailCache extends Model {
  static associate(models) {
    ThumbnailCache.belongsTo(models.Image, {
      foreignKey: 'imageId',
      as: 'image',
    });
  }
}

function initThumbnailCache(sequelize) {
  ThumbnailCache.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      imageId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'images',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      size: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'e.g. "200x200", "thumb", "medium"',
      },
      filename: {
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
      fileSize: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'ThumbnailCache',
      tableName: 'thumbnail_cache',
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ['imageId', 'size'],
          name: 'thumbnail_cache_image_id_size_unique',
        },
      ],
    }
  );

  return ThumbnailCache;
}

module.exports = { ThumbnailCache, initThumbnailCache };