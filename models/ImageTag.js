'use strict';

const { DataTypes, Model } = require('sequelize');

class ImageTag extends Model {
  static associate(models) {
    ImageTag.belongsTo(models.Image, {
      foreignKey: 'imageId',
      as: 'image',
    });
    ImageTag.belongsTo(models.Tag, {
      foreignKey: 'tagId',
      as: 'tag',
    });
  }
}

function initImageTag(sequelize) {
  ImageTag.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      imageId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'images',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      tagId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'tags',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
    },
    {
      sequelize,
      modelName: 'ImageTag',
      tableName: 'image_tags',
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ['imageId', 'tagId'],
          name: 'image_tags_image_id_tag_id_unique',
        },
      ],
    }
  );

  return ImageTag;
}

module.exports = { ImageTag, initImageTag };