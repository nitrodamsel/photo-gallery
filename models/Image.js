'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Image extends Model {
    static associate(models) {
      Image.belongsToMany(models.Tag, {
        through: models.ImageTag,
        foreignKey: 'imageId',
        otherKey: 'tagId'
      });
      Image.hasMany(models.ThumbnailCache, {
        foreignKey: 'imageId',
        onDelete: 'CASCADE'
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
      allowNull: false
    },
    originalName: {
      type: DataTypes.STRING,
      allowNull: true
    },
    mimeType: {
      type: DataTypes.STRING,
      allowNull: true
    },
    fileSize: {
      type: DataTypes.INTEGER,
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
      allowNull: true
    },
    exifData: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const val = this.getDataValue('exifData');
        if (!val) return null;
        try { return JSON.parse(val); } catch (e) { return val; }
      }
    },
    manualExif: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const val = this.getDataValue('manualExif');
        if (!val) return null;
        try { return JSON.parse(val); } catch (e) { return val; }
      }
    },
    rotation: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false
    },
    flipH: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    thumbnailFilename: {
      type: DataTypes.STRING,
      allowNull: true
    },
    uploadedBy: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Image',
    tableName: 'Images',
    timestamps: true
  });

  return Image;
};