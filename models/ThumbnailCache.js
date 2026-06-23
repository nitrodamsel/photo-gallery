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
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    size: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'e.g. "200x200" or just "200"',
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
        name: 'unique_thumbnail_image_size',
      },
    ],
  }
);

module.exports = ThumbnailCache;