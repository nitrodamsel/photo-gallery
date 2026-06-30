const { Tag, ImageTag, Image } = require('../models');
const { Op, fn, col, literal } = require('sequelize');

/**
 * Generate a slug from a tag name
 */
function generateSlug(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Validate tag name: 2–30 chars, alphanumeric + hyphens + spaces
 */
function validateTagName(name) {
  if (!name || name.length < 2 || name.length > 30) {
    throw new Error('Tag name must be between 2 and 30 characters.');
  }
  if (!/^[a-zA-Z0-9\s-]+$/.test(name)) {
    throw new Error('Tag name can only contain letters, numbers, spaces, and hyphens.');
  }
}

/**
 * Get all tags with image counts, ordered by count descending
 */
async function getAllTagsWithCounts() {
  const tags = await Tag.findAll({
    attributes: {
      include: [
        [fn('COUNT', col('ImageTags.id')), 'imageCount']
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
    order: [[literal('imageCount'), 'DESC']],
    subQuery: false
  });
  return tags;
}

/**
 * Search tags by name or slug using LIKE query
 */
async function searchTags(q) {
  const tags = await Tag.findAll({
    attributes: {
      include: [
        [fn('COUNT', col('ImageTags.id')), 'imageCount']
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
  return tags;
}

/**
 * Create a new tag
 */
async function createTag(name, color) {
  validateTagName(name);
  const slug = generateSlug(name);

  const existing = await Tag.findOne({ where: { slug } });
  if (existing) {
    throw new Error(`Tag '${name}' already exists.`);
  }

  const tag = await Tag.create({
    name,
    slug,
    color: color || null
  });
  return tag;
}

/**
 * Find or create a tag by name (case-insensitive via slug)
 */
async function findOrCreateByName(name) {
  validateTagName(name);
  const slug = generateSlug(name);

  const [tag] = await Tag.findOrCreate({
    where: { slug },
    defaults: {
      name,
      slug,
      color: null
    }
  });
  return tag;
}

/**
 * Update a tag (rename and/or change color)
 */
async function updateTag(id, { name, color }) {
  const tag = await Tag.findByPk(id);
  if (!tag) {
    throw new Error(`Tag with id ${id} not found.`);
  }

  if (name !== undefined) {
    validateTagName(name);
    const newSlug = generateSlug(name);

    // Check if new slug conflicts with another tag
    const existing = await Tag.findOne({ where: { slug: newSlug } });
    if (existing && existing.id !== tag.id) {
      throw new Error(`Tag '${name}' already exists.`);
    }

    tag.name = name;
    tag.slug = newSlug;
  }

  if (color !== undefined) {
    tag.color = color;
  }

  await tag.save();
  return tag;
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
  return deleted;
}

/**
 * Delete a tag and all its associations
 */
async function deleteTag(id) {
  const tag = await Tag.findByPk(id);
  if (!tag) {
    throw new Error(`Tag with id ${id} not found.`);
  }

  // Delete all ImageTag associations first
  await ImageTag.destroy({ where: { tagId: id } });

  // Then delete the tag
  await tag.destroy();
}

/**
 * Get all tags for a specific image
 */
async function getTagsForImage(imageId) {
  const imageTags = await ImageTag.findAll({
    where: { imageId },
    include: [{ model: Tag }]
  });
  return imageTags.map(it => it.Tag);
}

module.exports = {
  getAllTagsWithCounts,
  searchTags,
  createTag,
  findOrCreateByName,
  updateTag,
  assignTag,
  removeTag,
  deleteTag,
  getTagsForImage,
  generateSlug
};