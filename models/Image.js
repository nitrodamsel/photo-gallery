'use strict';

module.exports = (sequelize, DataTypes) => {
  const Image = sequelize.define('Image', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    filename: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    originalName: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    mimeType: {
      type: DataTypes.STRING(100),
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
    isPublic: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'Images',
    timestamps: true
  });

  Image.associate = function (models) {
    Image.belongsToMany(models.Tag, {
      through: models.ImageTag,
      foreignKey: 'imageId',
      otherKey: 'tagId'
    });
    Image.hasMany(models.ImageTag, {
      foreignKey: 'imageId'
    });
  };

  return Image;
};