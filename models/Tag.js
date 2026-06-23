'use strict';

const { DataTypes, Model, Op } = require('sequelize');
const sequelize = require('../config/database');

const DEFAULT_COLORS = [
  '#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6',
  '#1abc9c', '#e67e22', '#34495e', '#e91e63', '#00bcd4',
];

function slugify(name) {
  return name
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[\s\W-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function pickColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % DEFAULT_COLORS.length;
  return DEFAULT_COLORS[index];
}

class Tag extends Model {
  static async findOrCreateByName(name) {
    const slug = slugify(name);
    const color = pickColor(name);
    const [tag, created] = await Tag.findOrCreate({
      where: { slug },
      defaults: { name, slug, color },
    });
    return { tag, created };
  }
}

Tag.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    slug: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    color: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: 'Tag',
    tableName: 'tags',
    timestamps: true,
    hooks: {
      beforeCreate(tag) {
        if (!tag.slug) {
          tag.slug = slugify(tag.name);
        }
        if (!tag.color) {
          tag.color = pickColor(tag.name);
        }
      },
      beforeUpdate(tag) {
        if (tag.changed('name') && !tag.changed('slug')) {
          tag.slug = slugify(tag.name);
        }
      },
    },
  }
);

module.exports = Tag;