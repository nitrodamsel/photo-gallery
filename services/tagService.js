const { Tag, ImageTag, Image, sequelize } = require('../models');
const { Op } = require('sequelize');

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
 * Validate tag name: 2–30 chars, alphanumeric + hyphens + spaces
 */
function validateTagName(name) {
  if (!name || typeof name !== 'string') {
    throw new Error('Invalid tag name: must be a string');
  }
  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 30) {
    throw new Error('Invalid tag name: must be between 2 and 30 characters');
  }
  if (!/^[a-zA-Z0-9\s-]+$/.test(trimmed)) {
    throw new Error('Invalid tag name: only alphanumeric characters, spaces, and hyphens allowed');
  }
  return trimmed;
}

/**
 * Get all tags with their image counts, ordered by count desc
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

  return tags.map(tag => ({
    id: tag.id,
    name: tag.name,
    slug: tag.slug,
    color: tag.color,
    createdAt: tag.createdAt,
    imageCount: parseInt(tag.get('imageCount')) || 0
  }));
}

/**
 * Search tags by name or slug with LIKE query
 */
async function searchTags(q) {
  const searchPattern = `%${q}%`;
  const tags = await Tag.findAll({
    attributes: {
      include: [
        [
          sequelize.fn('COUNT', sequelize.col('ImageTags.id')),
          'imageCount'
        ]
      ]
    },
    where: {
      [Op.or]: [
        { name: { [Op.like]: searchPattern } },
        { slug: { [Op.like]: searchPattern } }
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

  return tags.map(tag => ({
    id: tag.id,
    name: tag.name,
    slug: tag.slug,
    color: tag.color,
    createdAt: tag.createdAt,
    imageCount: parseInt(tag.get('imageCount')) || 0
  }));
}

/**
 * Create a new tag
 */
async function createTag(name, color) {
  const validName = validateTagName(name);
  const slug = generateSlug(validName);

  // Check for existing tag with same slug (case-insensitive dedup)
  const existing = await Tag.findOne({ where: { slug } });
  if (existing) {
    throw new Error(`Tag already exists: "${existing.name}"`);
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
 * Find or create tag by name (case-insensitive via slug)
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
 * Rename a tag by id
 */
async function renameTag(id, name, color) {
  const tag = await Tag.findByPk(id);
  if (!tag) {
    throw new Error(`Tag not found: id=${id}`);
  }

  const validName = validateTagName(name);
  const newSlug = generateSlug(validName);

  // Check if another tag already has this slug
  const existing = await Tag.findOne({ where: { slug: newSlug } });
  if (existing && existing.id !== tag.id) {
    throw new Error(`Tag already exists: "${existing.name}"`);
  }

  await tag.update({
    name: validName,
    slug: newSlug,
    ...(color !== undefined ? { color } : {})
  });

  return {
    id: tag.id,
    name: tag.name,
    slug: tag.slug,
    color: tag.color,
    createdAt: tag.createdAt
  };
}

/**
 * Delete a tag and all its ImageTag associations
 */
async function deleteTag(id) {
  const tag = await Tag.findByPk(id);
  if (!tag) {
    throw new Error(`Tag not found: id=${id}`);
  }

  // Remove all image associations first
  await ImageTag.destroy({ where: { tagId: id } });

  // Delete the tag
  await tag.destroy();
  return true;
}

/**
 * Assign a tag to an image by name (finds or creates tag)
 * Returns updated array of tags for the image
 */
async function assignTag(imageId, tagName) {
  const tag = await findOrCreateTag(tagName);

  await ImageTag.findOrCreate({
    where: { imageId, tagId: tag.id }
  });

  return getTagsForImage(imageId);
}

/**
 * Remove a tag from an image
 * Returns updated array of tags for the image
 */
async function removeTag(imageId, tagId) {
  await ImageTag.destroy({ where: { imageId, tagId } });
  return getTagsForImage(imageId);
}

/**
 * Get all tags for a given image
 */
async function getTagsForImage(imageId) {
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

module.exports = {
  getAllTagsWithCounts,
  searchTags,
  createTag,
  findOrCreateTag,
  renameTag,
  deleteTag,
  assignTag,
  removeTag,
  getTagsForImage,
  generateSlug,
  validateTagName
};