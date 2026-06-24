const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ImageTag = sequelize.define(
    'ImageTag',
    {
      imageId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'images',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      tagId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'tags',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
    },
    {
      tableName: 'image_tags',
      timestamps: false,
      underscored: true,
    }
  );

  return ImageTag;
};