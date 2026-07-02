const { Image, Tag, ImageTag } = require('../models');
const imageService = require('./imageService');
const tagService = require('./tagService');

/**
 * Bulk tag multiple images with a tag name (creates tag if it doesn't exist)
 * @param {number[]} imageIds 
 * @param {string} tagName 
 * @returns {{ succeeded: number[], failed: Array<{id: number, error: string}> }}
 */
async function bulkTag(imageIds, tagName) {
  const succeeded = [];
  const failed = [];

  // Find or create the tag once
  let tag;
  try {
    tag = await tagService.findOrCreateTag(tagName);
  } catch (err) {
    // If we can't create the tag at all, fail everything
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

      // Check if already tagged
      const existing = await ImageTag.findOne({
        where: { imageId, tagId: tag.id }
      });

      if (!existing) {
        await ImageTag.create({ imageId, tagId: tag.id });
      }

      succeeded.push(imageId);
    } catch (err) {
      console.error(`Failed to tag image ${imageId}:`, err);
      failed.push({ id: imageId, error: err.message });
    }
  }

  return { succeeded, failed, tagId: tag.id, tagName: tag.name };
}

/**
 * Bulk remove a tag from multiple images
 * @param {number[]} imageIds 
 * @param {number|null} tagId 
 * @param {string|null} tagName 
 * @returns {{ succeeded: number[], failed: Array<{id: number, error: string}> }}
 */
async function bulkUntag(imageIds, tagId, tagName) {
  const succeeded = [];
  const failed = [];

  // Resolve tag if only name provided
  let resolvedTagId = tagId;
  if (!resolvedTagId && tagName) {
    try {
      const tag = await Tag.findOne({ where: { name: tagName } });
      if (!tag) {
        return {
          succeeded: [],
          failed: imageIds.map(id => ({ id, error: `Tag not found: ${tagName}` }))
        };
      }
      resolvedTagId = tag.id;
    } catch (err) {
      return {
        succeeded: [],
        failed: imageIds.map(id => ({ id, error: `Could not find tag: ${err.message}` }))
      };
    }
  }

  if (!resolvedTagId) {
    return {
      succeeded: [],
      failed: imageIds.map(id => ({ id, error: 'No tag ID or name provided' }))
    };
  }

  for (const imageId of imageIds) {
    try {
      const image = await Image.findByPk(imageId);
      if (!image) {
        failed.push({ id: imageId, error: 'Image not found' });
        continue;
      }

      await ImageTag.destroy({
        where: { imageId, tagId: resolvedTagId }
      });

      succeeded.push(imageId);
    } catch (err) {
      console.error(`Failed to untag image ${imageId}:`, err);
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
      await imageService.deleteImage(imageId);
      succeeded.push(imageId);
    } catch (err) {
      console.error(`Failed to delete image ${imageId}:`, err);
      failed.push({ id: imageId, error: err.message });
    }
  }

  return { succeeded, failed };
}

module.exports = { bulkTag, bulkUntag, bulkDelete };