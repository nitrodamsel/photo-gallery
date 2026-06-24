const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Image = sequelize.define(
    'Image',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      filename: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      originalFilename: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      filePath: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      publicUrl: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      mimeType: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      fileSize: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      title: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      exifData: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      dateTaken: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      cameraMake: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      cameraModel: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      lens: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      focalLength: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      aperture: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      shutterSpeed: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      iso: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      gpsLat: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },
      gpsLng: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },
      orientation: {
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
      thumb400Url: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      thumb1200Url: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      tableName: 'images',
      timestamps: true,
    }
  );

  Image.associate = (models) => {
    Image.belongsToMany(models.Tag, {
      through: models.ImageTag,
      foreignKey: 'imageId',
      otherKey: 'tagId',
      as: 'tags',
    });
  };

  return Image;
};