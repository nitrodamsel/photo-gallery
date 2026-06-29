const { Tag, ImageTag, Image } = require('../models');
const { Op } = require('sequelize');
const sequelize = require('../config/database');

/**
 * Normalize tag name: trim whitespace, lowercase for slug comparison
 */
function generateSlug(name) {
  return name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

/**
 * Validate tag name: 2–30 chars, alphanumeric + hyphens + spaces
 */
function validateTagName(name) {
  if (!name || typeof name !== 'string') {
    throw new Error('Invalid tag name');
  }
  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 30) {
    throw new Error('Invalid tag name: must be 2–30 characters');
  }
  if (!/^[a-zA-Z0-9\s-]+$/.test(trimmed)) {
    throw new Error('Invalid tag name: only alphanumeric characters, spaces, and hyphens allowed');
  }
  return trimmed;
}

/**
 * Get all tags with their image counts, ordered by count descending
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
    order: [[sequelize.fn('COUNT', sequelize.col('ImageTags.id')), 'DESC']],
    subQuery: false
  });

  return tags.map(tag => ({
    id: tag.id,
    name: tag.name,
    slug: tag.slug,
    color: tag.color,
    createdAt: tag.createdAt,
    imageCount: parseInt(tag.get('imageCount'), 10) || 0
  }));
}

/**
 * Search tags by name or slug with LIKE query
 */
async function searchTags(q) {
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
    where: {
      [Op.or]: [
        { name: { [Op.like]: `%${q}%` } },
        { slug: { [Op.like]: `%${q}%` } }
      ]
    },
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
    imageCount: parseInt(tag.get('imageCount'), 10) || 0
  }));
}

/**
 * Create a new tag
 */
async function createTag(name, color) {
  const validName = validateTagName(name);
  const slug = generateSlug(validName);

  // Check for duplicate slug (case-insensitive deduplication)
  const existing = await Tag.findOne({ where: { slug } });
  if (existing) {
    throw new Error(`Tag '${existing.name}' already exists`);
  }

  const tag = await Tag.create({
    name: validName,
    slug,
    color: color || null
  });

  return tag;
}

/**
 * Find or create a tag by name (case-insensitive slug matching)
 */
async function findOrCreateByName(name) {
  const validName = validateTagName(name);
  const slug = generateSlug(validName);

  const [tag, created] = await Tag.findOrCreate({
    where: { slug },
    defaults: {
      name: validName,
      slug,
      color: null
    }
  });

  return { tag, created };
}

/**
 * Rename a tag (regenerates slug)
 */
async function renameTag(id, name, color) {
  const tag = await Tag.findByPk(id);
  if (!tag) {
    throw new Error('Tag not found');
  }

  if (name !== undefined) {
    const validName = validateTagName(name);
    const slug = generateSlug(validName);

    // Check for duplicate slug (excluding current tag)
    const existing = await Tag.findOne({ where: { slug, id: { [Op.ne]: id } } });
    if (existing) {
      throw new Error(`Tag '${existing.name}' already exists`);
    }

    tag.name = validName;
    tag.slug = slug;
  }

  if (color !== undefined) {
    tag.color = color;
  }

  await tag.save();
  return tag;
}

/**
 * Delete a tag and all its ImageTag associations
 */
async function deleteTag(id) {
  const tag = await Tag.findByPk(id);
  if (!tag) {
    throw new Error('Tag not found');
  }

  // Remove all associations first
  await ImageTag.destroy({ where: { tagId: id } });

  // Delete the tag
  await tag.destroy();

  return true;
}

/**
 * Assign a tag to an image by tag name (finds or creates tag)
 */
async function assignTag(imageId, tagName) {
  const { tag } = await findOrCreateByName(tagName);

  // Create ImageTag if it doesn't exist
  await ImageTag.findOrCreate({
    where: { imageId, tagId: tag.id }
  });

  // Return updated tags for the image
  return getTagsForImage(imageId);
}

/**
 * Remove a tag from an image
 */
async function removeTagFromImage(imageId, tagId) {
  await ImageTag.destroy({
    where: { imageId, tagId }
  });

  // Return updated tags for the image
  return getTagsForImage(imageId);
}

/**
 * Get all tags for a specific image
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
  findOrCreateByName,
  renameTag,
  deleteTag,
  assignTag,
  removeTagFromImage,
  getTagsForImage,
  generateSlug,
  validateTagName
};