const path = require('path');
const { Op } = require('sequelize');
const { Image, Tag, ImageTag } = require('../models');
const { extractExif } = require('./exifService');
const { generateThumbnails, deleteThumbnails } = require('./thumbnailService');
const { safeDelete, getPublicUrl } = require('../utils/fileHelpers');

/**
 * Create a new Image record from an uploaded file.
 * @param {Express.Multer.File} file - Multer file object
 * @param {Object} options - Additional metadata (title, description, tags, etc.)
 * @returns {Promise<Image>} The created Image record with associations
 */
async function createImage(file, options = {}) {
  const originalPath = file.path;
  const originalFilename = file.originalname;
  const mimeType = file.verifiedMimeType || file.mimetype;
  const fileSize = file.size;

  // Step 1: Extract EXIF data
  let exifData = {};
  try {
    exifData = await extractExif(originalPath);
  } catch (err) {
    console.warn('[imageService] EXIF extraction failed, continuing:', err.message);
  }

  // Step 2: Build the Image record data
  const imageData = {
    filename: path.basename(originalPath),
    originalFilename,
    filePath: originalPath,
    publicUrl: getPublicUrl(originalPath),
    mimeType,
    fileSize,
    title: options.title || null,
    description: options.description || null,
    exifData: Object.keys(exifData).length > 0 ? exifData : null,
    dateTaken: exifData.dateTaken ? new Date(exifData.dateTaken) : null,
    cameraMake: exifData.camera?.make || null,
    cameraModel: exifData.camera?.model || null,
    lens: exifData.lens || null,
    focalLength: exifData.focalLength || null,
    aperture: exifData.aperture || null,
    shutterSpeed: exifData.shutterSpeed || null,
    iso: exifData.iso || null,
    gpsLat: exifData.gps?.lat || null,
    gpsLng: exifData.gps?.lng || null,
    orientation: exifData.orientation || null,
    width: exifData.dimensions?.width || null,
    height: exifData.dimensions?.height || null,
    thumb400Url: null,
    thumb1200Url: null,
  };

  // Step 3: Create DB record
  let image;
  try {
    image = await Image.create(imageData);
  } catch (err) {
    // If DB creation fails, clean up the uploaded file
    await safeDelete(originalPath);
    throw err;
  }

  // Step 4: Generate thumbnails (partial failure is acceptable)
  try {
    const thumbnails = await generateThumbnails(originalPath, image.id);
    const updates = {};

    if (thumbnails.thumb400) {
      updates.thumb400Url = getPublicUrl(thumbnails.thumb400);
    }
    if (thumbnails.thumb1200) {
      updates.thumb1200Url = getPublicUrl(thumbnails.thumb1200);
    }

    if (Object.keys(updates).length > 0) {
      await image.update(updates);
    }
  } catch (err) {
    console.error('[imageService] Thumbnail generation failed (non-fatal):', err.message);
  }

  // Step 5: Associate tags if provided
  if (options.tags && Array.isArray(options.tags) && options.tags.length > 0) {
    try {
      await associateTags(image, options.tags);
    } catch (err) {
      console.warn('[imageService] Tag association failed (non-fatal):', err.message);
    }
  }

  // Return fresh record with associations
  return getImageById(image.id);
}

/**
 * Associate an image with tags (creating tags if they don't exist).
 * @param {Image} image
 * @param {string[]} tagNames
 */
async function associateTags(image, tagNames) {
  const tagInstances = await Promise.all(
    tagNames.map((name) =>
      Tag.findOrCreate({
        where: { name: name.trim().toLowerCase() },
        defaults: { name: name.trim().toLowerCase() },
      }).then(([tag]) => tag)
    )
  );
  await image.setTags(tagInstances);
}

/**
 * Retrieve a paginated list of images with optional filtering.
 * @param {Object} filters
 * @param {number} filters.page - Page number (1-based)
 * @param {number} filters.limit - Items per page
 * @param {string} filters.tag - Filter by tag name
 * @param {string} filters.search - Search in title/description/filename
 * @param {string} filters.sortBy - Column to sort by
 * @param {string} filters.sortOrder - 'ASC' or 'DESC'
 * @returns {Promise<{ rows: Image[], count: number, pages: number }>}
 */
async function getImages(filters = {}) {
  const {
    page = 1,
    limit = 24,
    tag,
    search,
    sortBy = 'createdAt',
    sortOrder = 'DESC',
  } = filters;

  const offset = (Math.max(1, page) - 1) * limit;

  const where = {};
  const include = [
    {
      model: Tag,
      as: 'tags',
      through: { attributes: [] },
      required: false,
    },
  ];

  if (search) {
    where[Op.or] = [
      { title: { [Op.like]: `%${search}%` } },
      { description: { [Op.like]: `%${search}%` } },
      { originalFilename: { [Op.like]: `%${search}%` } },
    ];
  }

  if (tag) {
    include[0].required = true;
    include[0].where = { name: tag.toLowerCase() };
  }

  const allowedSortColumns = [
    'createdAt',
    'updatedAt',
    'dateTaken',
    'fileSize',
    'originalFilename',
    'title',
  ];
  const safeSort = allowedSortColumns.includes(sortBy) ? sortBy : 'createdAt';
  const safeOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  const { rows, count } = await Image.findAndCountAll({
    where,
    include,
    order: [[safeSort, safeOrder]],
    limit: Math.min(limit, 100),
    offset,
    distinct: true,
  });

  return {
    rows,
    count,
    pages: Math.ceil(count / limit),
    page: Number(page),
    limit: Number(limit),
  };
}

/**
 * Get a single image by ID with all associations.
 * @param {number} id
 * @returns {Promise<Image|null>}
 */
async function getImageById(id) {
  return Image.findByPk(id, {
    include: [
      {
        model: Tag,
        as: 'tags',
        through: { attributes: [] },
      },
    ],
  });
}

/**
 * Delete an image and all associated files.
 * @param {number} id
 * @returns {Promise<boolean>} true if deleted, false if not found
 */
async function deleteImage(id) {
  const image = await Image.findByPk(id);
  if (!image) return false;

  // Remove DB record first (cascades to ImageTags)
  await image.destroy();

  // Remove files (non-fatal)
  await safeDelete(image.filePath);
  await deleteThumbnails(id);

  return true;
}

module.exports = { createImage, getImages, getImageById, deleteImage };