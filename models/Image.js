const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Image = sequelize.define('Image', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    filename: {
      type: DataTypes.STRING,
      allowNull: false,
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
      allowNull: false,
    },
    filePath: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    thumbnailPath: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    largeThumbnailPath: {
      type: DataTypes.STRING,
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
    width: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    height: {
      type: DataTypes.INTEGER,
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
    dateTaken: {
      type: DataTypes.DATE,
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
  }, {
    tableName: 'images',
    timestamps: true,
  });

  Image.associate = (models) => {
    Image.belongsToMany(models.Tag, {
      through: models.ImageTag,
      foreignKey: 'imageId',
      otherKey: 'tagId',
      as: 'Tags',
    });
  };

  return Image;
};