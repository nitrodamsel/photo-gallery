'use strict';

const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class ImageTag extends Model {}

ImageTag.init(
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
    tagId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'tags',
        key: 'id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
  },
  {
    sequelize,
    modelName: 'ImageTag',
    tableName: 'image_tags',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['imageId', 'tagId'],
        name: 'unique_image_tag',
      },
    ],
  }
);

module.exports = ImageTag;