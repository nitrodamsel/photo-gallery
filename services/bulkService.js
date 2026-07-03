const { Image, Tag, ImageTag } = require('../models');
const imageService = require('./imageService');
const tagService = require('./tagService');

/**
 * Bulk tag multiple images with a tag name (creates tag if not exists)
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
    tag = await tagService.findOrCreateTag(tagName);
  } catch (err) {
    // If we can't even create the tag, all fail
    return {
      succeeded: [],
      failed: imageIds.map(id => ({ id, error: `Could not find/create tag: ${err.message}` }))
    };
  }

  for (const imageId of imageIds) {
    try {
      const image = await Image.findByPk(imageId);
      if (!image) {
        failed.push({ id: imageId, error: 'Image not found' });
        continue;
      }

      // Use findOrCreate to avoid duplicate associations
      await ImageTag.findOrCreate({
        where: { imageId: image.id, tagId: tag.id }
      });

      succeeded.push(imageId);
    } catch (err) {
      console.error(`bulkTag failed for image ${imageId}:`, err);
      failed.push({ id: imageId, error: err.message });
    }
  }

  return { succeeded, failed, tag: { id: tag.id, name: tag.name } };
}

/**
 * Bulk remove a tag from multiple images
 * @param {number[]} imageIds
 * @param {number} tagId
 * @returns {{ succeeded: number[], failed: Array<{id: number, error: string}> }}
 */
async function bulkUntag(imageIds, tagId) {
  const succeeded = [];
  const failed = [];

  // Verify tag exists
  let tag;
  try {
    tag = await Tag.findByPk(tagId);
    if (!tag) {
      return {
        succeeded: [],
        failed: imageIds.map(id => ({ id, error: `Tag ${tagId} not found` }))
      };
    }
  } catch (err) {
    return {
      succeeded: [],
      failed: imageIds.map(id => ({ id, error: `Could not find tag: ${err.message}` }))
    };
  }

  for (const imageId of imageIds) {
    try {
      const deleted = await ImageTag.destroy({
        where: { imageId, tagId }
      });

      succeeded.push(imageId);
    } catch (err) {
      console.error(`bulkUntag failed for image ${imageId}:`, err);
      failed.push({ id: imageId, error: err.message });
    }
  }

  return { succeeded, failed };
}

/**
 * Bulk delete multiple images
 * @param {number[]} imageIds
 * @returns {{ succeeded: number[], failed: Array<{id: number, error: string}> }}
 */
async function bulkDelete(imageIds) {
  const succeeded = [];
  const failed = [];

  for (const imageId of imageIds) {
    try {
      const image = await Image.findByPk(imageId);
      if (!image) {
        failed.push({ id: imageId, error: 'Image not found' });
        continue;
      }

      await imageService.deleteImage(image);
      succeeded.push(imageId);
    } catch (err) {
      console.error(`bulkDelete failed for image ${imageId}:`, err);
      failed.push({ id: imageId, error: err.message });
    }
  }

  return { succeeded, failed };
}

module.exports = { bulkTag, bulkUntag, bulkDelete };