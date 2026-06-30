const { Tag, ImageTag, Image } = require('../models');
const { Op } = require('sequelize');
const sequelize = require('../config/database');

/**
 * Generate a URL-friendly slug from a tag name
 */
function generateSlug(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

/**
 * Validate tag name: 2-30 chars, alphanumeric + hyphens + spaces
 */
function validateTagName(name) {
  if (!name || typeof name !== 'string') {
    throw new Error('Invalid tag name');
  }
  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 30) {
    throw new Error('Invalid tag name: must be 2-30 characters');
  }
  if (!/^[a-zA-Z0-9\s-]+$/.test(trimmed)) {
    throw new Error('Invalid tag name: only alphanumeric characters, spaces, and hyphens allowed');
  }
  return trimmed;
}

/**
 * Get all tags with image counts, ordered by count descending
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
    subQuery: false
  });

  return tags.map(tag => ({
    id: tag.id,
    name: tag.name,
    slug: tag.slug,
    color: tag.color,
    createdAt: tag.createdAt,
    imageCount: parseInt(tag.get('imageCount') || 0, 10)
  }));
}

/**
 * Search tags by name/slug with LIKE query
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
    subQuery: false
  });

  return tags.map(tag => ({
    id: tag.id,
    name: tag.name,
    slug: tag.slug,
    color: tag.color,
    createdAt: tag.createdAt,
    imageCount: parseInt(tag.get('imageCount') || 0, 10)
  }));
}

/**
 * Create a new tag
 */
async function createTag(name, color) {
  const validName = validateTagName(name);
  const slug = generateSlug(validName);

  // Check for duplicate by slug (case-insensitive deduplication)
  const existing = await Tag.findOne({ where: { slug } });
  if (existing) {
    throw new Error(`Tag '${validName}' already exists`);
  }

  const tag = await Tag.create({
    name: validName,
    slug,
    color: color || '#6c757d'
  });

  return {
    id: tag.id,
    name: tag.name,
    slug: tag.slug,
    color: tag.color,
    createdAt: tag.createdAt,
    imageCount: 0
  };
}

/**
 * Find or create a tag by name (used when assigning tags)
 */
async function findOrCreateTag(name) {
  const validName = validateTagName(name);
  const slug = generateSlug(validName);

  const [tag] = await Tag.findOrCreate({
    where: { slug },
    defaults: {
      name: validName,
      slug,
      color: '#6c757d'
    }
  });

  return tag;
}

/**
 * Rename a tag (regenerates slug)
 */
async function renameTag(id, name, color) {
  const tag = await Tag.findByPk(id);
  if (!tag) {
    throw new Error(`Tag not found: ${id}`);
  }

  const validName = validateTagName(name);
  const newSlug = generateSlug(validName);

  // Check if another tag already has this slug
  const existing = await Tag.findOne({ where: { slug: newSlug } });
  if (existing && existing.id !== tag.id) {
    throw new Error(`Tag '${validName}' already exists`);
  }

  await tag.update({
    name: validName,
    slug: newSlug,
    ...(color ? { color } : {})
  });

  // Get updated image count
  const count = await ImageTag.count({ where: { tagId: tag.id } });

  return {
    id: tag.id,
    name: tag.name,
    slug: tag.slug,
    color: tag.color,
    createdAt: tag.createdAt,
    imageCount: count
  };
}

/**
 * Assign a tag to an image by tag name
 * Returns the updated tags array for the image
 */
async function assignTag(imageId, tagName) {
  const tag = await findOrCreateTag(tagName);

  // Create ImageTag if it doesn't exist
  await ImageTag.findOrCreate({
    where: { imageId, tagId: tag.id }
  });

  // Return updated tags list for the image
  return getImageTags(imageId);
}

/**
 * Remove a tag from an image
 * Returns the updated tags array for the image
 */
async function removeTag(imageId, tagId) {
  await ImageTag.destroy({
    where: { imageId, tagId }
  });

  return getImageTags(imageId);
}

/**
 * Get all tags for a specific image
 */
async function getImageTags(imageId) {
  const imageTags = await ImageTag.findAll({
    where: { imageId },
    include: [{ model: Tag }]
  });

  return imageTags.map(it => ({
    id: it.Tag.id,
    name: it.Tag.name,
    slug: it.Tag.slug,
    color: it.Tag.color
  }));
}

/**
 * Delete a tag and all its associations
 */
async function deleteTag(id) {
  const tag = await Tag.findByPk(id);
  if (!tag) {
    throw new Error(`Tag not found: ${id}`);
  }

  // Delete all ImageTag associations first
  await ImageTag.destroy({ where: { tagId: id } });

  // Delete the tag
  await tag.destroy();

  return true;
}

module.exports = {
  getAllTagsWithCounts,
  searchTags,
  createTag,
  findOrCreateTag,
  renameTag,
  assignTag,
  removeTag,
  getImageTags,
  deleteTag,
  generateSlug,
  validateTagName
};