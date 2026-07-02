'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Image extends Model {
    static associate(models) {
      Image.belongsToMany(models.Tag, {
        through: models.ImageTag,
        as: 'tags',
        foreignKey: 'imageId'
      });
      Image.hasMany(models.ThumbnailCache, {
        as: 'thumbnails',
        foreignKey: 'imageId'
      });
    }
  }

  Image.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    filename: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    originalName: {
      type: DataTypes.STRING,
      allowNull: true
    },
    mimeType: {
      type: DataTypes.STRING,
      allowNull: true
    },
    size: {
      type: DataTypes.BIGINT,
      allowNull: true
    },
    width: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    height: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: ''
    },
    exifData: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {}
    },
    rotation: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        isIn: [[0, 90, 180, 270]]
      },
      comment: 'Non-destructive rotation in degrees'
    },
    manualExif: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
      comment: 'Manual overrides: caption, locationName, dateTaken, camera'
    }
  }, {
    sequelize,
    modelName: 'Image',
    tableName: 'Images',
    timestamps: true
  });

  return Image;
};