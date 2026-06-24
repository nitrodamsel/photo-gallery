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
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
      },
      slug: {
        type: DataTypes.STRING(100),
        allowNull: true,
        unique: true,
      },
      color: {
        type: DataTypes.STRING(7),
        allowNull: true,
        defaultValue: '#6c757d',
      },
    },
    {
      tableName: 'tags',
      timestamps: true,
      underscored: true,
      hooks: {
        beforeCreate: (tag) => {
          if (!tag.slug && tag.name) {
            tag.slug = tag.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
          }
        },
        beforeUpdate: (tag) => {
          if (tag.changed('name') && !tag.changed('slug')) {
            tag.slug = tag.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
          }
        },
      },
    }
  );

  Tag.associate = function (models) {
    Tag.belongsToMany(models.Image, {
      through: models.ImageTag,
      foreignKey: 'tagId',
      otherKey: 'imageId',
      as: 'Images',
    });
  };

  return Tag;
};