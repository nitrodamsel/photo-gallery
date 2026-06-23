'use strict';

const { DataTypes, Model, Op } = require('sequelize');
const sequelize = require('../config/database');

/**
 * Simple slugify helper — converts a string to a URL-safe slug.
 */
function slugify(str) {
  return str
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, '-')       // spaces and underscores → dashes
    .replace(/[^a-z0-9-]/g, '')    // remove non-alphanumeric (except dashes)
    .replace(/--+/g, '-')          // collapse multiple dashes
    .replace(/^-|-$/g, '');        // trim leading/trailing dashes
}

/** Default color palette assigned to tags in round-robin order */
const COLOR_PALETTE = [
  '#E53E3E', // red
  '#DD6B20', // orange
  '#D69E2E', // yellow
  '#38A169', // green
  '#3182CE', // blue
  '#805AD5', // purple
  '#D53F8C', // pink
  '#319795', // teal
];

let colorIndex = 0;

function nextColor() {
  const color = COLOR_PALETTE[colorIndex % COLOR_PALETTE.length];
  colorIndex += 1;
  return color;
}

class Tag extends Model {
  /**
   * Find or create a tag by name.
   * @param {string} name
   * @returns {Promise<[Tag, boolean]>} [tag, created]
   */
  static async findOrCreateByName(name) {
    const trimmed = name.trim();
    const slug = slugify(trimmed);

    const [tag, created] = await Tag.findOrCreate({
      where: {
        [Op.or]: [{ name: trimmed }, { slug }],
      },
      defaults: {
        name: trimmed,
        slug,
        color: nextColor(),
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
      allowNull: false,
      defaultValue: '#3182CE',
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
          tag.color = nextColor();
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