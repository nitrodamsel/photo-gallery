const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Tag = sequelize.define('Tag', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
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
  }, {
    tableName: 'tags',
    timestamps: true,
    hooks: {
      beforeCreate: (tag) => {
        if (!tag.slug && tag.name) {
          tag.slug = tag.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        }
      },
    },
  });

  Tag.associate = (models) => {
    Tag.belongsToMany(models.Image, {
      through: models.ImageTag,
      foreignKey: 'tagId',
      otherKey: 'imageId',
      as: 'Images',
    });
  };

  return Tag;
};