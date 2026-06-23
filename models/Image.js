'use strict';

const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class Image extends Model {
  /**
   * Returns a public-safe JSON representation of the image,
   * stripping any internal or sensitive fields.
   */
  toPublicJSON() {
    const values = { ...this.get({ plain: true }) };
    // Remove any internal fields if needed
    return {
      id: values.id,
      filename: values.filename,
      originalName: values.originalName,
      mimeType: values.mimeType,
      fileSize: values.fileSize,
      width: values.width,
      height: values.height,
      exifData: values.exifData,
      uploadedAt: values.uploadedAt,
      description: values.description,
      tags: values.Tags || values.tags || [],
      createdAt: values.createdAt,
      updatedAt: values.updatedAt,
    };
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