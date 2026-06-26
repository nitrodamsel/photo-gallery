const { Image, Tag, ImageTag } = require('../models');
const { Op, fn, col, literal } = require('sequelize');
const path = require('path');
const fs = require('fs');

/**
 * Get paginated images with optional tag filter.
 */
async function getImages({ page = 1, limit = 12, tag = null } = {}) {
  const offset = (page - 1) * limit;

  const queryOptions = {
    include: [
      {
        model: Tag,
        as: 'tags',
        through: { attributes: [] },
      },
    ],
    order: [['created_at', 'DESC']],
    limit,
    offset,
    distinct: true,
  };

  if (tag) {
    queryOptions.include[0].where = { slug: tag };
    queryOptions.include[0].required = true;
  }

  const { count, rows } = await Image.findAndCountAll(queryOptions);

  return {
    images: rows,
    total: count,
  };
}

/**
 * Get a single image by ID with all associations.
 */
async function getImageById(id) {
  const image = await Image.findByPk(id, {
    include: [
      {
        model: Tag,
        as: 'tags',
        through: { attributes: [] },
      },
    ],
  });

  return image;
}

/**
 * Get the previous image (uploaded before this one).
 */
async function getPrevImage(id) {
  const image = await Image.findOne({
    where: { id: { [Op.lt]: id } },
    order: [['id', 'DESC']],
    attributes: ['id', 'original_filename'],
  });
  return image;
}

/**
 * Get the next image (uploaded after this one).
 */
async function getNextImage(id) {
  const image = await Image.findOne({
    where: { id: { [Op.gt]: id } },
    order: [['id', 'ASC']],
    attributes: ['id', 'original_filename'],
  });
  return image;
}

/**
 * Get thumbnail URL for a given image and size.
 */
function getThumbnailUrl(image, size = 400) {
  if (!image) return null;
  const filename = image.stored_filename || image.original_filename;
  if (!filename) return null;
  const ext = path.extname(filename);
  const base = path.basename(filename, ext);
  return `/uploads/thumbnails/${base}_${size}${ext}`;
}

/**
 * Delete an image and its file from disk.
 */
async function deleteImage(id) {
  const image = await Image.findByPk(id);
  if (!image) throw new Error('Image not found');

  // Remove file
  const filePath = path.join(__dirname, '..', 'uploads', image.stored_filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  await image.destroy();
}

module.exports = {
  getImages,
  getImageById,
  getPrevImage,
  getNextImage,
  getThumbnailUrl,
  deleteImage,
};