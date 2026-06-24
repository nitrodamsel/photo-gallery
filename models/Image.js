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
      originalName: {
        type: DataTypes.STRING(512),
        allowNull: false,
      },
      filename: {
        type: DataTypes.STRING(512),
        allowNull: false,
      },
      filePath: {
        type: DataTypes.STRING(1024),
        allowNull: false,
      },
      publicUrl: {
        type: DataTypes.STRING(1024),
        allowNull: true,
      },
      mimeType: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      fileSize: {
        type: DataTypes.BIGINT,
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
      // Thumbnail paths
      thumbnail400Path: {
        type: DataTypes.STRING(1024),
        allowNull: true,
      },
      thumbnail400Url: {
        type: DataTypes.STRING(1024),
        allowNull: true,
      },
      thumbnail1200Path: {
        type: DataTypes.STRING(1024),
        allowNull: true,
      },
      thumbnail1200Url: {
        type: DataTypes.STRING(1024),
        allowNull: true,
      },
      // EXIF data stored as JSON blob
      exifData: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      // Indexed EXIF fields for querying
      dateTaken: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      cameraMake: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      cameraModel: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      gpsLat: {
        type: DataTypes.DECIMAL(10, 7),
        allowNull: true,
      },
      gpsLng: {
        type: DataTypes.DECIMAL(10, 7),
        allowNull: true,
      },
    },
    {
      tableName: 'images',
      timestamps: true,
      underscored: true,
    }
  );

  Image.associate = function (models) {
    Image.belongsToMany(models.Tag, {
      through: models.ImageTag,
      foreignKey: 'imageId',
      otherKey: 'tagId',
      as: 'Tags',
    });
  };

  return Image;
};