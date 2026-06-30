const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Tag extends Model {
    static associate(models) {
      Tag.belongsToMany(models.Image, {
        through: models.ImageTag,
        foreignKey: 'tagId',
        otherKey: 'imageId',
        as: 'Images'
      });
      Tag.hasMany(models.ImageTag, {
        foreignKey: 'tagId'
      });
    }
  }

  Tag.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(30),
      allowNull: false,
      validate: {
        len: [2, 30],
        is: /^[a-zA-Z0-9\s-]+$/
      }
    },
    slug: {
      type: DataTypes.STRING(30),
      allowNull: false,
      unique: true
    },
    color: {
      type: DataTypes.STRING(7),
      allowNull: true,
      defaultValue: '#6c757d'
    }
  }, {
    sequelize,
    modelName: 'Tag',
    tableName: 'tags',
    timestamps: true
  });

  return Tag;
};