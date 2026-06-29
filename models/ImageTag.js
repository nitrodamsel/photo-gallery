'use strict';

module.exports = (sequelize, DataTypes) => {
  const ImageTag = sequelize.define('ImageTag', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    imageId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Images',
        key: 'id'
      }
    },
    tagId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Tags',
        key: 'id'
      }
    }
  }, {
    tableName: 'ImageTags',
    timestamps: true
  });

  ImageTag.associate = function (models) {
    ImageTag.belongsTo(models.Image, { foreignKey: 'imageId' });
    ImageTag.belongsTo(models.Tag, { foreignKey: 'tagId' });
  };

  return ImageTag;
};