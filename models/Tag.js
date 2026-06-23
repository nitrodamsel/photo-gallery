'use strict';

const { DataTypes, Model, Op } = require('sequelize');

/**
 * Simple slug generator (avoids external dependency).
 * Converts "Hello World!" -> "hello-world"
 */
function slugify(str) {
  return str
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, '-')       // spaces/underscores -> hyphens
    .replace(/[^\w-]+/g, '')        // remove non-word chars except hyphens
    .replace(/--+/g, '-')           // collapse multiple hyphens
    .replace(/^-+|-+$/g, '');       // trim leading/trailing hyphens
}

// Default color palette for auto-assignment
const DEFAULT_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f59e0b', // amber
  '#6366f1', // indigo
];

let colorIndex = 0;

function getNextColor() {
  const color = DEFAULT_COLORS[colorIndex % DEFAULT_COLORS.length];
  colorIndex += 1;
  return color;
}

class Tag extends Model {
  /**
   * Find an existing tag by name or create a new one.
   * @param {string} name
   * @returns {Promise<[Tag, boolean]>} [tag, created]
   */
  static async findOrCreateByName(name) {
    const trimmedName = name.trim();
    const slug = slugify(trimmedName);

    return Tag.findOrCreate({
      where: { slug },
      defaults: {
        name: trimmedName,
        slug,
        color: getNextColor(),
      },
    });
  }

  static associate(models) {
    Tag.belongsToMany(models.Image, {
      through: models.ImageTag,
      foreignKey: 'tagId',
      otherKey: 'imageId',
      as: 'images',
    });
    Tag.hasMany(models.ImageTag, {
      foreignKey: 'tagId',
      as: 'imageTags',
    });
  }
}

function initTag(sequelize) {
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
        type: DataTypes.STRING(7), // hex color e.g. #ff0000
        allowNull: false,
        defaultValue: '#3b82f6',
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'Tag',
      tableName: 'tags',
      timestamps: true,
      updatedAt: false,
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

  return Tag;
}

module.exports = { Tag, initTag, slugify };