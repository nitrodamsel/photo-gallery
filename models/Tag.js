const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Tag = sequelize.define('Tag', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      validate: {
        len: [2, 30],
        notEmpty: true
      }
    },
    slug: {
      type: DataTypes.STRING(60),
      allowNull: false,
      unique: true
    },
    color: {
      type: DataTypes.STRING(7),
      defaultValue: '#6c757d',
      validate: {
        is: /^#[0-9a-fA-F]{6}$/
      }
    }
  }, {
    tableName: 'tags',
    timestamps: true
  });

  Tag.associate = (models) => {
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