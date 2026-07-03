const imageService = require('./imageService');
const tagService = require('./tagService');
const { Image, Tag, ImageTag } = require('../models');

/**
 * Assign a tag to multiple images by tag name (creates tag if it doesn't exist)
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
    const normalizedName = tagName.trim().toLowerCase();
    [tag] = await Tag.findOrCreate({
      where: { name: normalizedName },
      defaults: { name: normalizedName }
    });
  } catch (err) {
    // If we can't even find/create the tag, fail everything
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

  // Verify the tag exists
  const tag = await Tag.findByPk(tagId);
  if (!tag) {
    return {
      succeeded: [],
      failed: imageIds.map(id => ({ id, error: `Tag ${tagId} not found` }))
    };
  }

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
 * Delete multiple images (files + DB records)
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