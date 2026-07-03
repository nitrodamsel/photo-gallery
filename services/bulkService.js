const { Op } = require('sequelize');
const Image = require('../models/Image');
const Tag = require('../models/Tag');
const ImageTag = require('../models/ImageTag');
const imageService = require('./imageService');
const tagService = require('./tagService');

/**
 * Assign a tag (by name) to multiple images.
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
    [tag] = await Tag.findOrCreate({
      where: { name: tagName.trim().toLowerCase() },
      defaults: { name: tagName.trim().toLowerCase() }
    });
  } catch (err) {
    // If we can't find/create the tag, fail all
    return {
      succeeded: [],
      failed: imageIds.map(id => ({ id, error: `Tag error: ${err.message}` }))
    };
  }

  for (const imageId of imageIds) {
    try {
      const image = await Image.findByPk(imageId);
      if (!image) {
        failed.push({ id: imageId, error: 'Image not found' });
        continue;
      }

      // Use findOrCreate to avoid duplicate tags
      await ImageTag.findOrCreate({
        where: { imageId: image.id, tagId: tag.id }
      });

      succeeded.push(imageId);
    } catch (err) {
      console.error(`bulkTag failed for image ${imageId}:`, err);
      failed.push({ id: imageId, error: err.message });
    }
  }

  return { succeeded, failed };
}

/**
 * Remove a tag from multiple images.
 * @param {number[]} imageIds
 * @param {number|null} tagId
 * @param {string|null} tagName
 * @returns {{ succeeded: number[], failed: Array<{id: number, error: string}> }}
 */
async function bulkUntag(imageIds, tagId, tagName) {
  const succeeded = [];
  const failed = [];

  // Resolve tag
  let tag;
  try {
    if (tagId) {
      tag = await Tag.findByPk(tagId);
    } else if (tagName) {
      tag = await Tag.findOne({ where: { name: tagName.trim().toLowerCase() } });
    }

    if (!tag) {
      return {
        succeeded: [],
        failed: imageIds.map(id => ({ id, error: 'Tag not found' }))
      };
    }
  } catch (err) {
    return {
      succeeded: [],
      failed: imageIds.map(id => ({ id, error: `Tag lookup error: ${err.message}` }))
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
        where: { imageId: image.id, tagId: tag.id }
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
 * Delete multiple images (files + DB records).
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
      console.error(`bulkDelete failed for image ${imageId}:`, err);
      failed.push({ id: imageId, error: err.message });
    }
  }

  return { succeeded, failed };
}

module.exports = { bulkTag, bulkUntag, bulkDelete };