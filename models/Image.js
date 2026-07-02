'use strict';

const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Image extends Model {
    static associate(models) {
      Image.belongsToMany(models.Tag, {
        through: models.ImageTag,
        foreignKey: 'imageId',
        otherKey: 'tagId'
      });
    }

    // Get parsed manual EXIF data
    getParsedManualExif() {
      try {
        return this.manualExif ? JSON.parse(this.manualExif) : {};
      } catch (e) {
        return {};
      }
    }

    // Get parsed EXIF data
    getParsedExif() {
      try {
        return this.exifData ? JSON.parse(this.exifData) : {};
      } catch (e) {
        return {};
      }
    }

    // Get merged EXIF (manualExif overrides exifData)
    getMergedExif() {
      const auto = this.getParsedExif();
      const manual = this.getParsedManualExif();
      return { ...auto, ...manual };
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
    mimetype: {
      type: DataTypes.STRING,
      allowNull: true
    },
    size: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    exifData: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    manualExif: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    rotation: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false
    },
    width: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    height: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    hash: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Image',
    tableName: 'Images'
  });

  return Image;
};