const path = require('path');
const { Op } = require('sequelize');
const { Image, Tag, ImageTag } = require('../models');
const { extractExif } = require('./exifService');
const { generateThumbnails, deleteThumbnails } = require('./thumbnailService');
const { safeDelete, getPublicUrl } = require('../utils/fileHelpers');

/**
 * Create a new Image record from an uploaded file.
 * Orchestrates: EXIF extraction → thumbnail generation → DB persistence.
 *
 * @param {object} file - Multer file object
 * @param {object} [options] - Additional options
 * @param {string[]} [options.tags] - Array of tag names to associate
 * @returns {Promise<Image>} The created Image model instance
 */
async function createImage(file, options = {}) {
  const filePath = file.path;
  const originalName = file.originalname;
  const mimeType = file.detectedMime || file.mimetype;
  const fileSize = file.size;

  // 1. Extract EXIF metadata (non-fatal — returns {} on failure)
  let exifData = {};
  try {
    exifData = await extractExif(filePath);
  } catch (err) {
    console.warn('[imageService] EXIF extraction failed, continuing without EXIF:', err.message);
  }

  // 2. Build image record data
  const imageData = {
    originalName,
    filename: path.basename(filePath),
    filePath,
    publicUrl: getPublicUrl(filePath),
    mimeType,
    fileSize,
    width: exifData.width || null,
    height: exifData.height || null,
    exifData: Object.keys(exifData).length > 0 ? exifData : null,
    dateTaken: exifData.dateTaken ? new Date(exifData.dateTaken) : null,
    cameraMake: exifData.cameraMake || null,
    cameraModel: exifData.cameraModel || null,
    gpsLat: exifData.gps ? exifData.gps.lat : null,
    gpsLng: exifData.gps ? exifData.gps.lng : null,
  };

  // 3. Create the Image DB record
  const image = await Image.create(imageData);

  // 4. Generate thumbnails (non-fatal — log and continue on failure)
  try {
    const { thumb400, thumb1200 } = await generateThumbnails(filePath, image.id);

    const updates = {};
    if (thumb400) {
      updates.thumbnail400Path = thumb400;
      updates.thumbnail400Url = getPublicUrl(thumb400);
    }
    if (thumb1200) {
      updates.thumbnail1200Path = thumb1200;
      updates.thumbnail1200Url = getPublicUrl(thumb1200);
    }

    if (Object.keys(updates).length > 0) {
      await image.update(updates);
    }
  } catch (err) {
    console.error('[imageService] Thumbnail generation failed, continuing with original only:', err.message);
  }

  // 5. Associate tags if provided
  if (options.tags && Array.isArray(options.tags) && options.tags.length > 0) {
    try {
      const tagRecords = await Promise.all(
        options.tags.map((name) =>
          Tag.findOrCreate({ where: { name: name.trim().toLowerCase() } }).then(([tag]) => tag)
        )
      );
      await image.setTags(tagRecords);
    } catch (err) {
      console.warn('[imageService] Tag association failed:', err.message);
    }
  }

  // 6. Reload with associations
  return image.reload({
    include: [{ model: Tag, through: { attributes: [] } }],
  });
}

/**
 * Get a paginated list of images with optional tag filtering.
 * @param {object} [filters]
 * @param {number} [filters.page=1]
 * @param {number} [filters.limit=20]
 * @param {string[]} [filters.tags] - Filter by tag names
 * @param {string} [filters.order='createdAt'] - Sort field
 * @param {string} [filters.direction='DESC'] - Sort direction
 * @returns {Promise<{ images: Image[], total: number, page: number, pages: number }>}
 */
async function getImages(filters = {}) {
  const {
    page = 1,
    limit = 20,
    tags,
    order = 'createdAt',
    direction = 'DESC',
  } = filters;

  const offset = (Math.max(1, page) - 1) * limit;

  const queryOptions = {
    include: [{ model: Tag, through: { attributes: [] } }],
    order: [[order, direction.toUpperCase()]],
    limit: parseInt(limit, 10),
    offset,
    distinct: true,
  };

  // Tag filtering
  if (tags && tags.length > 0) {
    queryOptions.include = [
      {
        model: Tag,
        through: { attributes: [] },
        where: { name: { [Op.in]: tags.map((t) => t.toLowerCase()) } },
        required: true,
      },
    ];
  }

  const { count, rows } = await Image.findAndCountAll(queryOptions);

  return {
    images: rows,
    total: count,
    page: parseInt(page, 10),
    pages: Math.ceil(count / limit),
    limit: parseInt(limit, 10),
  };
}

/**
 * Get a single image by ID with eager-loaded tags.
 * @param {string|number} id
 * @returns {Promise<Image|null>}
 */
async function getImageById(id) {
  return Image.findByPk(id, {
    include: [{ model: Tag, through: { attributes: [] } }],
  });
}

/**
 * Delete an image and all associated files (original + thumbnails).
 * @param {string|number} id
 * @returns {Promise<boolean>} true if deleted, false if not found
 */
async function deleteImage(id) {
  const image = await Image.findByPk(id);
  if (!image) return false;

  // Delete files (non-fatal)
  await safeDelete(image.filePath);
  await deleteThumbnails(id);

  // Remove DB record (cascades to ImageTag junction)
  await image.destroy();

  return true;
}

module.exports = { createImage, getImages, getImageById, deleteImage };