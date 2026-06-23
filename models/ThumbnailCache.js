'use strict';

const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class ThumbnailCache extends Model {}

ThumbnailCache.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
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
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Thumbnail size in pixels (width)',
    },
    filename: {
      type: DataTypes.STRING,
      allowNull: false,
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
        name: 'thumbnail_cache_imageId_size_unique',
      },
    ],
  }
);

module.exports = ThumbnailCache;