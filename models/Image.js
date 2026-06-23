'use strict';

const { DataTypes, Model } = require('sequelize');

class Image extends Model {
  /**
   * Returns a public-safe JSON representation, stripping internal fields.
   */
  toPublicJSON() {
    const values = { ...this.get() };
    // Strip any internal or sensitive fields if needed
    delete values.deletedAt;
    return values;
  }

  static associate(models) {
    Image.belongsToMany(models.Tag, {
      through: models.ImageTag,
      foreignKey: 'imageId',
      otherKey: 'tagId',
      as: 'tags',
    });
    Image.hasMany(models.ImageTag, {
      foreignKey: 'imageId',
      as: 'imageTags',
    });
    Image.hasMany(models.ThumbnailCache, {
      foreignKey: 'imageId',
      as: 'thumbnails',
    });
  }
}

function initImage(sequelize) {
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

  return Image;
}

module.exports = { Image, initImage };