const imageService = require('./imageService');
const tagService = require('./tagService');
const Image = require('../models/Image');
const Tag = require('../models/Tag');
const ImageTag = require('../models/ImageTag');

/**
 * Assign a tag to multiple images by tag name (creates tag if not exists)
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
    // If tag creation fails, all images fail
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

      // Check if already tagged
      const existing = await ImageTag.findOne({
        where: { imageId: image.id, tagId: tag.id }
      });

      if (!existing) {
        await ImageTag.create({ imageId: image.id, tagId: tag.id });
      }

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
      failed: imageIds.map(id => ({ id, error: `Tag with id ${tagId} not found` }))
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

module.exports = {
  bulkTag,
  bulkUntag,
  bulkDelete
};