'use strict';

const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class Image extends Model {
  toPublicJSON() {
    const { id, filename, originalName, mimeType, fileSize, width, height, exifData, uploadedAt, description, Tags } = this.get({ plain: true });
    const result = { id, filename, originalName, mimeType, fileSize, width, height, exifData, uploadedAt, description };
    if (Tags !== undefined) {
      result.tags = Tags;
    }
    return result;
  }
}

Image.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    filename: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    originalName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    mimeType: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    fileSize: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    width: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    height: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    exifData: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: null,
    },
    uploadedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
  },
  {
    sequelize,
    modelName: 'Image',
    tableName: 'images',
    timestamps: true,
  }
);

module.exports = Image;