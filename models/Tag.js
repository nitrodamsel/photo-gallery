'use strict';

const { DataTypes, Model, Op } = require('sequelize');
const sequelize = require('../config/database');

// Simple slugify helper (avoids external dependency for now)
function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, '-')       // Replace spaces and underscores with -
    .replace(/[^\w-]+/g, '')       // Remove non-word chars except -
    .replace(/--+/g, '-')          // Replace multiple - with single -
    .replace(/^-+/, '')            // Trim - from start
    .replace(/-+$/, '');           // Trim - from end
}

// Default color palette for auto-assignment
const COLOR_PALETTE = [
  '#e74c3c', // red
  '#3498db', // blue
  '#2ecc71', // green
  '#f39c12', // orange
  '#9b59b6', // purple
  '#1abc9c', // teal
  '#e67e22', // dark orange
  '#34495e', // dark gray
  '#e91e63', // pink
  '#00bcd4', // cyan
];

let colorIndex = 0;

function getNextColor() {
  const color = COLOR_PALETTE[colorIndex % COLOR_PALETTE.length];
  colorIndex++;
  return color;
}

class Tag extends Model {
  /**
   * Finds an existing tag by name or creates a new one.
   * @param {string} name - The tag name.
   * @returns {Promise<[Tag, boolean]>} - [tag, created]
   */
  static async findOrCreateByName(name) {
    const trimmedName = name.trim();
    const slug = slugify(trimmedName);

    const [tag, created] = await Tag.findOrCreate({
      where: {
        [Op.or]: [{ name: trimmedName }, { slug }],
      },
      defaults: {
        name: trimmedName,
        slug,
        color: getNextColor(),
      },
    });

    return [tag, created];
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
      defaultValue: '#3498db',
    },
  },
  {
    sequelize,
    modelName: 'Tag',
    tableName: 'tags',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: false, // Only track createdAt per spec
    hooks: {
      beforeCreate(tag) {
        if (!tag.slug) {
          tag.slug = slugify(tag.name);
        }
        if (!tag.color) {
          tag.color = getNextColor();
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