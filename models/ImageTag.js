'use strict';

const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class ImageTag extends Model {}

ImageTag.init(
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
    tagId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'tags',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
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
        name: 'image_tags_imageId_tagId_unique',
      },
    ],
  }
);

module.exports = ImageTag;