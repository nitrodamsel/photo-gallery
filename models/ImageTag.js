const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ImageTag = sequelize.define('ImageTag', {
    imageId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'images', key: 'id' },
    },
    tagId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'tags', key: 'id' },
    },
  }, {
    tableName: 'image_tags',
    timestamps: false,
  });

  return ImageTag;
};