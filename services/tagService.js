const { Tag, ImageTag, Image } = require('../models');
const { Op, fn, col, literal } = require('sequelize');

/**
 * Generate a URL-friendly slug from a tag name.
 */
function generateSlug(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-]/g, '');
}

/**
 * Get all tags with their image counts, ordered by count descending.
 */
async function getAllTagsWithCounts() {
  const tags = await Tag.findAll({
    attributes: {
      include: [
        [fn('COUNT', col('ImageTags.id')), 'imageCount']
      ]
    },
    include: [{
      model: ImageTag,
      attributes: []
    }],
    group: ['Tag.id'],
    order: [[literal('imageCount'), 'DESC']],
    subQuery: false
  });
  return tags;
}

/**
 * Search tags by name or slug using a LIKE query.
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
        [fn('COUNT', col('ImageTags.id')), 'imageCount']
      ]
    },
    include: [{
      model: ImageTag,
      attributes: []
    }],
    group: ['Tag.id'],
    order: [['name', 'ASC']],
    subQuery: false,
    limit: 20
  });
  return tags;
}

/**
 * Find or create a tag by name (case-insensitive via slug matching).
 */
async function findOrCreateByName(name, color) {
  const slug = generateSlug(name);

  // Try to find by slug first (case-insensitive deduplication)
  let tag = await Tag.findOne({ where: { slug } });

  if (!tag) {
    const tagData = { name, slug };
    if (color) tagData.color = color;
    tag = await Tag.create(tagData);
  }

  return tag;
}

/**
 * Rename a tag and regenerate its slug.
 */
async function renameTag(id, newName, color) {
  const tag = await Tag.findByPk(id);
  if (!tag) throw new Error('Tag not found');

  const newSlug = generateSlug(newName);

  // Check for duplicate slug on a different tag
  const existing = await Tag.findOne({ where: { slug: newSlug } });
  if (existing && existing.id !== tag.id) {
    const err = new Error('Duplicate tag');
    err.name = 'SequelizeUniqueConstraintError';
    throw err;
  }

  tag.name = newName;
  tag.slug = newSlug;
  if (color !== undefined) tag.color = color;
  await tag.save();

  return tag;
}

/**
 * Assign a tag to an image. Creates the tag if it doesn't exist.
 */
async function assignTag(imageId, tagName, color) {
  const tag = await findOrCreateByName(tagName, color);

  // Create ImageTag if it doesn't exist
  await ImageTag.findOrCreate({
    where: { imageId, tagId: tag.id }
  });

  return tag;
}

/**
 * Remove a tag from an image.
 */
async function removeTag(imageId, tagId) {
  const destroyed = await ImageTag.destroy({
    where: { imageId, tagId }
  });
  return destroyed;
}

/**
 * Delete a tag and all its associations.
 */
async function deleteTag(id) {
  const tag = await Tag.findByPk(id);
  if (!tag) throw new Error('Tag not found');

  // Delete all ImageTag associations first
  await ImageTag.destroy({ where: { tagId: id } });

  // Delete the tag
  await tag.destroy();

  return true;
}

module.exports = {
  getAllTagsWithCounts,
  searchTags,
  findOrCreateByName,
  renameTag,
  assignTag,
  removeTag,
  deleteTag,
  generateSlug
};