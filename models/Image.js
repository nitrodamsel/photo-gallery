'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Image extends Model {
    static associate(models) {
      Image.belongsToMany(models.Tag, {
        through: models.ImageTag,
        foreignKey: 'imageId',
        otherKey: 'tagId',
        as: 'Tags'
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
    // EXIF data stored as JSON
    exifData: {
      type: DataTypes.JSON,
      allowNull: true
    },
    // Manual EXIF overrides
    manualExif: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: null
    },
    // GPS coordinates
    latitude: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    longitude: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    altitude: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    // Camera info
    cameraMake: {
      type: DataTypes.STRING,
      allowNull: true
    },
    cameraModel: {
      type: DataTypes.STRING,
      allowNull: true
    },
    lensModel: {
      type: DataTypes.STRING,
      allowNull: true
    },
    // Capture settings
    focalLength: {
      type: DataTypes.STRING,
      allowNull: true
    },
    aperture: {
      type: DataTypes.STRING,
      allowNull: true
    },
    shutterSpeed: {
      type: DataTypes.STRING,
      allowNull: true
    },
    iso: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    // Date taken
    dateTaken: {
      type: DataTypes.DATE,
      allowNull: true
    },
    // Non-destructive rotation: 0, 90, 180, 270, -1 (flipH), -2 (flipV)
    rotation: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    // Upload metadata
    uploadedBy: {
      type: DataTypes.STRING,
      allowNull: true
    },
    ipAddress: {
      type: DataTypes.STRING,
      allowNull: true
    },
    // Processing flags
    thumbnailGenerated: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    exifProcessed: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    sequelize,
    modelName: 'Image',
    tableName: 'Images',
    timestamps: true
  });

  return Image;
};