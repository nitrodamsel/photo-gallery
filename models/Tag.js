'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Tag extends Model {
    static associate(models) {
      Tag.belongsToMany(models.Image, {
        through: models.ImageTag,
        foreignKey: 'tagId',
        otherKey: 'imageId'
      });
      Tag.hasMany(models.ImageTag, { foreignKey: 'tagId' });
    }
  }

  Tag.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      name: {
        type: DataTypes.STRING(50),
        allowNull: false,
        validate: {
          len: [2, 30],
          is: /^[a-zA-Z0-9\s-]+$/
        }
      },
      slug: {
        type: DataTypes.STRING(60),
        allowNull: false,
        unique: true
      },
      color: {
        type: DataTypes.STRING(20),
        defaultValue: '#6c757d'
      }
    },
    {
      sequelize,
      modelName: 'Tag',
      tableName: 'tags',
      timestamps: true
    }
  );

  return Tag;
};