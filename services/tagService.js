const { Tag, ImageTag, Image, sequelize } = require('../models');
const { Op } = require('sequelize');

/**
 * Validate tag name: 2–30 chars, alphanumeric + hyphens + spaces, case-insensitive
 */
function validateTagName(name) {
  if (!name || typeof name !== 'string') {
    throw new Error('Invalid tag name: must be a string');
  }
  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 30) {
    throw new Error('Invalid tag name: must be between 2 and 30 characters');
  }
  if (!/^[a-zA-Z0-9\s\-]+$/.test(trimmed)) {
    throw new Error('Invalid tag name: only alphanumeric characters, hyphens, and spaces are allowed');
  }
  return trimmed;
}

/**
 * Generate a slug from a tag name
 */
function generateSlug(name) {
  return name.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');
}

/**
 * Get all tags with image counts, ordered by count desc
 */
async function getAllTagsWithCounts() {
  const tags = await Tag.findAll({
    attributes: {
      include: [
        [
          sequelize.fn('COUNT', sequelize.col('ImageTags.id')),
          'imageCount'
        ]
      ]
    },
    include: [
      {
        model: ImageTag,
        attributes: [],
        required: false
      }
    ],
    group: ['Tag.id'],
    order: [[sequelize.literal('imageCount'), 'DESC']],
    raw: false,
    subQuery: false
  });

  return tags.map(tag => {
    const plain = tag.get({ plain: true });
    plain.imageCount = parseInt(plain.imageCount || 0, 10);
    return plain;
  });
}

/**
 * Search tags by name or slug (LIKE query)
 */
async function searchTags(q) {
  const tags = await Tag.findAll({
    where: {
      [Op.or]: [
        { name: { [Op.like]: `%${q}%` } },
        { slug: { [Op.like]: `%${q}%` } }
      ]
    },
    attributes: {
      include: [
        [
          sequelize.fn('COUNT', sequelize.col('ImageTags.id')),
          'imageCount'
        ]
      ]
    },
    include: [
      {
        model: ImageTag,
        attributes: [],
        required: false
      }
    ],
    group: ['Tag.id'],
    order: [['name', 'ASC']],
    raw: false,
    subQuery: false
  });

  return tags.map(tag => {
    const plain = tag.get({ plain: true });
    plain.imageCount = parseInt(plain.imageCount || 0, 10);
    return plain;
  });
}

/**
 * Find or create a tag by name (case-insensitive, slug-based deduplication)
 */
async function findOrCreateByName(name) {
  const validName = validateTagName(name);
  const slug = generateSlug(validName);

  // Check for existing tag with same slug (case-insensitive dedup)
  let tag = await Tag.findOne({ where: { slug } });
  if (tag) {
    return tag;
  }

  // Create new tag
  tag = await Tag.create({
    name: validName,
    slug,
    color: generateRandomColor()
  });

  return tag;
}

/**
 * Create a new tag explicitly
 */
async function createTag(name, color) {
  const validName = validateTagName(name);
  const slug = generateSlug(validName);

  // Check for duplicate
  const existing = await Tag.findOne({ where: { slug } });
  if (existing) {
    throw new Error(`Tag '${validName}' already exists`);
  }

  const tag = await Tag.create({
    name: validName,
    slug,
    color: color || generateRandomColor()
  });

  return tag.get({ plain: true });
}

/**
 * Rename a tag (regenerates slug)
 */
async function renameTag(id, newName, color) {
  const tag = await Tag.findByPk(id);
  if (!tag) {
    throw new Error(`Tag with id ${id} not found`);
  }

  const validName = validateTagName(newName);
  const slug = generateSlug(validName);

  // Check for duplicate slug on a different tag
  const existing = await Tag.findOne({ where: { slug, id: { [Op.ne]: id } } });
  if (existing) {
    throw new Error(`Tag '${validName}' already exists`);
  }

  await tag.update({
    name: validName,
    slug,
    ...(color ? { color } : {})
  });

  return tag.get({ plain: true });
}

/**
 * Assign a tag to an image (finds or creates tag, then creates ImageTag if not exists)
 */
async function assignTag(imageId, tagName) {
  const tag = await findOrCreateByName(tagName);

  await ImageTag.findOrCreate({
    where: { imageId, tagId: tag.id }
  });

  return tag;
}

/**
 * Remove a tag from an image
 */
async function removeTag(imageId, tagId) {
  const deleted = await ImageTag.destroy({
    where: { imageId, tagId }
  });
  return deleted > 0;
}

/**
 * Delete a tag entirely (cascades to ImageTag rows)
 */
async function deleteTag(id) {
  const tag = await Tag.findByPk(id);
  if (!tag) {
    throw new Error(`Tag with id ${id} not found`);
  }

  // Remove all ImageTag associations first
  await ImageTag.destroy({ where: { tagId: id } });

  // Delete the tag
  await tag.destroy();

  return true;
}

/**
 * Get all tags for a specific image
 */
async function getTagsForImage(imageId) {
  const imageTags = await ImageTag.findAll({
    where: { imageId },
    include: [{ model: Tag }]
  });

  return imageTags.map(it => it.Tag ? it.Tag.get({ plain: true }) : null).filter(Boolean);
}

/**
 * Generate a random pastel color for tags
 */
function generateRandomColor() {
  const colors = [
    '#4CAF50', '#2196F3', '#FF9800', '#E91E63', '#9C27B0',
    '#00BCD4', '#FF5722', '#607D8B', '#795548', '#3F51B5',
    '#009688', '#FFC107', '#F44336', '#8BC34A', '#03A9F4'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

module.exports = {
  getAllTagsWithCounts,
  searchTags,
  findOrCreateByName,
  createTag,
  renameTag,
  assignTag,
  removeTag,
  deleteTag,
  getTagsForImage,
  generateSlug,
  validateTagName
};