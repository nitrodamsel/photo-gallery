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
      Image.hasMany(models.ImageTag, {
        foreignKey: 'imageId'
      });
      Image.hasMany(models.ThumbnailCache, {
        foreignKey: 'imageId',
        as: 'Thumbnails'
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
      allowNull: false
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
    title: {
      type: DataTypes.STRING,
      allowNull: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    exifData: {
      type: DataTypes.JSON,
      allowNull: true
    },
    latitude: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    longitude: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    takenAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Image',
    tableName: 'images',
    timestamps: true
  });

  return Image;
};