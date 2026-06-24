const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Tag = sequelize.define(
    'Tag',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      slug: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      color: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      tableName: 'tags',
      timestamps: true,
    }
  );

  Tag.associate = (models) => {
    Tag.belongsToMany(models.Image, {
      through: models.ImageTag,
      foreignKey: 'tagId',
      otherKey: 'imageId',
      as: 'images',
    });
  };

  return Tag;
};