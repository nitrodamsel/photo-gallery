const { Tag, Image, ImageTag } = require('../models');
const { Op } = require('sequelize');

/**
 * Find or create a tag by name
 * @param {string} name
 * @returns {Promise<Tag>}
 */
async function findOrCreateTag(name) {
  const normalizedName = name.trim().toLowerCase();
  const [tag] = await Tag.findOrCreate({
    where: { name: normalizedName }
  });
  return tag;
}

/**
 * Get all tags with usage counts
 */
async function getAllTagsWithCounts() {
  const tags = await Tag.findAll({
    include: [{
      model: Image,
      as: 'images',
      through: { attributes: [] },
      attributes: ['id']
    }],
    order: [['name', 'ASC']]
  });

  return tags.map(tag => ({
    id: tag.id,
    name: tag.name,
    count: tag.images ? tag.images.length : 0
  }));
}

/**
 * Get tags for a specific image
 * @param {number} imageId
 */
async function getTagsForImage(imageId) {
  const image = await Image.findByPk(imageId, {
    include: [{ model: Tag, as: 'tags', through: { attributes: [] } }]
  });
  return image ? image.tags : [];
}

/**
 * Add tag to image
 * @param {number} imageId
 * @param {string} tagName
 */
async function addTagToImage(imageId, tagName) {
  const tag = await findOrCreateTag(tagName);
  await ImageTag.findOrCreate({
    where: { imageId, tagId: tag.id }
  });
  return tag;
}

/**
 * Remove tag from image
 * @param {number} imageId
 * @param {number} tagId
 */
async function removeTagFromImage(imageId, tagId) {
  await ImageTag.destroy({
    where: { imageId, tagId }
  });
}

/**
 * Search tags by name prefix
 * @param {string} query
 */
async function searchTags(query) {
  return Tag.findAll({
    where: {
      name: { [Op.like]: `${query}%` }
    },
    limit: 20,
    order: [['name', 'ASC']]
  });
}

module.exports = {
  findOrCreateTag,
  getAllTagsWithCounts,
  getTagsForImage,
  addTagToImage,
  removeTagFromImage,
  searchTags
};