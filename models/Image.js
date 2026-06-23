'use strict';

const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class Image extends Model {
  /**
   * Returns a plain object suitable for public API responses,
   * stripping any internal/sensitive fields.
   */
  toPublicJSON() {
    const values = this.toJSON();
    // Remove any internal fields if needed
    delete values.updatedAt;
    return values;
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
      allowNull: true,
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