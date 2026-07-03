const imageService = require('./imageService');
const tagService = require('./tagService');
const ImageTag = require('../models/ImageTag');
const Image = require('../models/Image');
const Tag = require('../models/Tag');

/**
 * Assign a tag to multiple images
 * @param {number[]} imageIds
 * @param {string} tagName
 * @returns {{ succeeded: number[], failed: Array<{id: number, error: string}> }}
 */
async function bulkTag(imageIds, tagName) {
  const succeeded = [];
  const failed = [];

  // Find or create the tag
  let tag;
  try {
    [tag] = await Tag.findOrCreate({
      where: { name: tagName.trim().toLowerCase() },
      defaults: { name: tagName.trim().toLowerCase() }
    });
  } catch (err) {
    return {
      succeeded: [],
      failed: imageIds.map(id => ({ id, error: `Failed to find/create tag: ${err.message}` }))
    };
  }

  for (const imageId of imageIds) {
    try {
      const image = await Image.findByPk(imageId);
      if (!image) {
        failed.push({ id: imageId, error: 'Image not found' });
        continue;
      }

      await ImageTag.findOrCreate({
        where: { imageId, tagId: tag.id }
      });

      succeeded.push(imageId);
    } catch (err) {
      failed.push({ id: imageId, error: err.message });
    }
  }

  return { succeeded, failed, tagId: tag.id, tagName: tag.name };
}

/**
 * Remove a tag from multiple images
 * @param {number[]} imageIds
 * @param {number} tagId
 * @returns {{ succeeded: number[], failed: Array<{id: number, error: string}> }}
 */
async function bulkUntag(imageIds, tagId) {
  const succeeded = [];
  const failed = [];

  for (const imageId of imageIds) {
    try {
      const image = await Image.findByPk(imageId);
      if (!image) {
        failed.push({ id: imageId, error: 'Image not found' });
        continue;
      }

      const deleted = await ImageTag.destroy({
        where: { imageId, tagId }
      });

      succeeded.push(imageId);
    } catch (err) {
      failed.push({ id: imageId, error: err.message });
    }
  }

  return { succeeded, failed };
}

/**
 * Delete multiple images
 * @param {number[]} imageIds
 * @returns {{ succeeded: number[], failed: Array<{id: number, error: string}> }}
 */
async function bulkDelete(imageIds) {
  const succeeded = [];
  const failed = [];

  for (const imageId of imageIds) {
    try {
      await imageService.deleteImage(imageId);
      succeeded.push(imageId);
    } catch (err) {
      failed.push({ id: imageId, error: err.message });
    }
  }

  return { succeeded, failed };
}

module.exports = { bulkTag, bulkUntag, bulkDelete };