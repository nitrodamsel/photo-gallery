const { Image, Tag, ImageTag } = require('../models');
const imageService = require('./imageService');
const tagService = require('./tagService');

/**
 * Bulk-assign a tag to multiple images by tag name.
 * Creates the tag if it doesn't exist.
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
    console.error('Failed to find/create tag:', err);
    return {
      succeeded: [],
      failed: imageIds.map(id => ({ id, error: 'Tag creation failed' }))
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
        where: { imageId: image.id, tagId: tag.id }
      });

      succeeded.push(imageId);
    } catch (err) {
      console.error(`Failed to tag image ${imageId}:`, err);
      failed.push({ id: imageId, error: err.message });
    }
  }

  return { succeeded, failed };
}

/**
 * Bulk-remove a tag from multiple images.
 * @param {number[]} imageIds
 * @param {number} tagId
 * @returns {{ succeeded: number[], failed: Array<{id: number, error: string}> }}
 */
async function bulkUntag(imageIds, tagId) {
  const succeeded = [];
  const failed = [];

  const tag = await Tag.findByPk(tagId);
  if (!tag) {
    return {
      succeeded: [],
      failed: imageIds.map(id => ({ id, error: 'Tag not found' }))
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
        where: { imageId: image.id, tagId: tag.id }
      });

      if (deleted === 0) {
        // Not an error — tag just wasn't applied
        succeeded.push(imageId);
      } else {
        succeeded.push(imageId);
      }
    } catch (err) {
      console.error(`Failed to untag image ${imageId}:`, err);
      failed.push({ id: imageId, error: err.message });
    }
  }

  return { succeeded, failed };
}

/**
 * Bulk-delete multiple images (files + DB records).
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