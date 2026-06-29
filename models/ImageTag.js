const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
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
        model: 'images',
        key: 'id'
      }
    },
    tagId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'tags',
        key: 'id'
      }
    }
  }, {
    tableName: 'image_tags',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['imageId', 'tagId']
      }
    ]
  });

  ImageTag.associate = (models) => {
    ImageTag.belongsTo(models.Image, { foreignKey: 'imageId' });
    ImageTag.belongsTo(models.Tag, { foreignKey: 'tagId' });
  };

  return ImageTag;
};