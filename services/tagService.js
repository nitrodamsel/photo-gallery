const { Tag, ImageTag, Image } = require('../models');
const { Op } = require('sequelize');

async function findOrCreateTag(name) {
  const normalizedName = name.trim().toLowerCase();
  const [tag] = await Tag.findOrCreate({
    where: { name: normalizedName },
    defaults: { name: normalizedName }
  });
  return tag;
}

async function getAllTags() {
  return Tag.findAll({ order: [['name', 'ASC']] });
}

async function getTagWithCount() {
  const tags = await Tag.findAll({
    include: [{
      model: Image,
      through: { attributes: [] },
      attributes: ['id']
    }],
    order: [['name', 'ASC']]
  });

  return tags.map(tag => ({
    ...tag.toJSON(),
    imageCount: tag.Images ? tag.Images.length : 0
  }));
}

async function getTagById(id) {
  return Tag.findByPk(id);
}

async function deleteTag(id) {
  const tag = await Tag.findByPk(id);
  if (!tag) throw new Error('Tag not found');
  await ImageTag.destroy({ where: { tagId: id } });
  await tag.destroy();
  return true;
}

async function getTagsForImage(imageId) {
  return Tag.findAll({
    include: [{
      model: Image,
      through: { attributes: [] },
      where: { id: imageId },
      attributes: []
    }]
  });
}

module.exports = {
  findOrCreateTag,
  getAllTags,
  getTagWithCount,
  getTagById,
  deleteTag,
  getTagsForImage
};