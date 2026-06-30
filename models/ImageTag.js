'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ImageTag extends Model {
    static associate(models) {
      ImageTag.belongsTo(models.Image, { foreignKey: 'imageId' });
      ImageTag.belongsTo(models.Tag, { foreignKey: 'tagId' });
    }
  }

  ImageTag.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      imageId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'images', key: 'id' }
      },
      tagId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'tags', key: 'id' }
      }
    },
    {
      sequelize,
      modelName: 'ImageTag',
      tableName: 'image_tags',
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ['imageId', 'tagId']
        }
      ]
    }
  );

  return ImageTag;
};