const { Tag, ImageTag, Image } = require('../models');
const { Op } = require('sequelize');

/**
 * Find or create a tag by name (case-insensitive)
 */
async function findOrCreateTag(tagName) {
  const normalizedName = tagName.trim().toLowerCase();
  const [tag] = await Tag.findOrCreate({
    where: { name: normalizedName }
  });
  return tag;
}

/**
 * Get all tags with image counts
 */
async function getAllTagsWithCounts() {
  const tags = await Tag.findAll({
    include: [{
      model: Image,
      through: { attributes: [] },
      attributes: ['id']
    }],
    order: [['name', 'ASC']]
  });

  return tags.map(tag => ({
    id: tag.id,
    name: tag.name,
    count: tag.Images ? tag.Images.length : 0
  }));
}

/**
 * Get tags for a specific image
 */
async function getTagsForImage(imageId) {
  const tags = await Tag.findAll({
    include: [{
      model: Image,
      through: { attributes: [] },
      where: { id: imageId },
      attributes: []
    }]
  });
  return tags;
}

/**
 * Add a tag to an image
 */
async function addTagToImage(imageId, tagName) {
  const tag = await findOrCreateTag(tagName);
  const [imagetag, created] = await ImageTag.findOrCreate({
    where: { imageId, tagId: tag.id }
  });
  return { tag, created };
}

/**
 * Remove a tag from an image
 */
async function removeTagFromImage(imageId, tagId) {
  const deleted = await ImageTag.destroy({
    where: { imageId, tagId }
  });
  return deleted > 0;
}

/**
 * Delete a tag entirely
 */
async function deleteTag(tagId) {
  await ImageTag.destroy({ where: { tagId } });
  await Tag.destroy({ where: { id: tagId } });
}

module.exports = {
  findOrCreateTag,
  getAllTagsWithCounts,
  getTagsForImage,
  addTagToImage,
  removeTagFromImage,
  deleteTag
};