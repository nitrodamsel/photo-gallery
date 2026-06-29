'use strict';

module.exports = (sequelize, DataTypes) => {
  const Tag = sequelize.define('Tag', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        len: [2, 30],
        is: /^[a-zA-Z0-9\s\-]+$/
      }
    },
    slug: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true
    },
    color: {
      type: DataTypes.STRING(20),
      allowNull: true,
      defaultValue: '#6c757d'
    }
  }, {
    tableName: 'Tags',
    timestamps: true
  });

  Tag.associate = function (models) {
    Tag.belongsToMany(models.Image, {
      through: models.ImageTag,
      foreignKey: 'tagId',
      otherKey: 'imageId'
    });
    Tag.hasMany(models.ImageTag, {
      foreignKey: 'tagId'
    });
  };

  return Tag;
};