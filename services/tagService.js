const { Tag, ImageTag, Image } = require('../models');
const { Op, fn, col, literal } = require('sequelize');

/**
 * Generate a slug from a tag name
 */
function generateSlug(name) {
  return name.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

/**
 * Get all tags with their image counts, ordered by count desc
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

  return tags.map(tag => {
    const plain = tag.get({ plain: true });
    plain.imageCount = parseInt(plain.imageCount || 0, 10);
    return plain;
  });
}

/**
 * Search tags by name or slug with LIKE query
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
    include: [
      {
        model: ImageTag,
        attributes: [],
        required: false
      }
    ],
    group: ['Tag.id'],
    order: [[literal('imageCount'), 'DESC']],
    subQuery: false,
    limit: 20
  });

  return tags.map(tag => {
    const plain = tag.get({ plain: true });
    plain.imageCount = parseInt(plain.imageCount || 0, 10);
    return plain;
  });
}

/**
 * Find or create a tag by name (case-insensitive via slug)
 */
async function findOrCreateByName(name, color) {
  const slug = generateSlug(name);

  let tag = await Tag.findOne({ where: { slug } });

  if (tag) {
    return tag.get({ plain: true });
  }

  tag = await Tag.create({
    name: name.trim(),
    slug,
    color: color || '#6c757d'
  });

  return tag.get({ plain: true });
}

/**
 * Assign a tag to an image, creating the tag if needed
 */
async function assignTag(imageId, tagName, color) {
  const tag = await findOrCreateByName(tagName, color);

  await ImageTag.findOrCreate({
    where: { imageId, tagId: tag.id }
  });

  return getTagsForImage(imageId);
}

/**
 * Remove a tag from an image
 */
async function removeTag(imageId, tagId) {
  await ImageTag.destroy({
    where: { imageId, tagId }
  });

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

  return imageTags.map(it => {
    const tag = it.Tag ? it.Tag.get({ plain: true }) : null;
    return tag;
  }).filter(Boolean);
}

/**
 * Rename a tag (regenerates slug)
 */
async function renameTag(id, newName) {
  const tag = await Tag.findByPk(id);
  if (!tag) {
    throw new Error('Tag not found.');
  }

  const newSlug = generateSlug(newName);

  // Check if another tag with that slug exists
  const existing = await Tag.findOne({ where: { slug: newSlug } });
  if (existing && existing.id !== tag.id) {
    throw new Error(`Tag "${newName}" already exists.`);
  }

  tag.name = newName.trim();
  tag.slug = newSlug;
  await tag.save();

  return tag.get({ plain: true });
}

/**
 * Delete a tag and all its associations
 */
async function deleteTag(id) {
  const tag = await Tag.findByPk(id);
  if (!tag) {
    throw new Error('Tag not found.');
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
  findOrCreateByName,
  assignTag,
  removeTag,
  getTagsForImage,
  renameTag,
  deleteTag,
  generateSlug
};