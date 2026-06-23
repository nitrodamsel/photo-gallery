'use strict';

const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class ThumbnailCache extends Model {}

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
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    size: {
      type: DataTypes.STRING,
      allowNull: false,
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
    generatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
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
        name: 'unique_thumbnail_image_size',
      },
    ],
  }
);

module.exports = ThumbnailCache;