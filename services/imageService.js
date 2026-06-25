const path = require('path');
const { Image, Tag, ImageTag } = require('../models');
const { extractExif } = require('./exifService');
const { generateThumbnails, deleteThumbnails } = require('./thumbnailService');
const { safeDelete, getPublicUrl } = require('../utils/fileHelpers');
const { Op } = require('sequelize');

/**
 * Create a new image record from an uploaded file.
 * @param {Express.Multer.File} file - Multer file object.
 * @param {Object} options - Additional options (tags, title, etc.)
 * @returns {Promise<Image>} Created image record with associations.
 */
async function createImage(file, options = {}) {
  const filePath = file.path;
  const originalFilename = file.originalname;
  const mimeType = file.detectedMime || file.mimetype;
  const fileSize = file.size;

  // 1. Extract EXIF metadata
  let exifData = {};
  try {
    exifData = await extractExif(filePath);
  } catch (err) {
    console.warn(`[imageService] EXIF extraction failed: ${err.message}`);
  }

  // 2. Build the initial image record
  const imageData = {
    filename: path.basename(filePath),
    originalFilename,
    filePath: getPublicUrl(filePath),
    mimeType,
    fileSize,
    width: exifData.imageWidth || null,
    height: exifData.imageHeight || null,
    exifData: Object.keys(exifData).length > 0 ? exifData : null,
    cameraMake: exifData.cameraMake || null,
    cameraModel: exifData.cameraModel || null,
    lensModel: exifData.lensModel || null,
    focalLength: exifData.focalLength || null,
    aperture: exifData.aperture || null,
    shutterSpeed: exifData.shutterSpeed || null,
    iso: exifData.iso || null,
    dateTaken: exifData.dateTaken || null,
    gpsLat: exifData.gps ? exifData.gps.lat : null,
    gpsLng: exifData.gps ? exifData.gps.lng : null,
    gpsAltitude: exifData.gps ? exifData.gps.altitude : null,
    colorSpace: exifData.colorSpace || null,
    orientation: exifData.orientation || null,
    title: options.title || null,
    description: options.description || null,
    status: options.status || 'active',
  };

  // 3. Persist to DB (get the ID for thumbnails)
  let image;
  try {
    image = await Image.create(imageData);
  } catch (err) {
    // Clean up uploaded file if DB insert fails
    await safeDelete(filePath);
    throw Object.assign(new Error('Failed to save image to database: ' + err.message), { status: 500 });
  }

  // 4. Generate thumbnails (non-fatal — partial failures are logged)
  let thumbnails = {};
  try {
    thumbnails = await generateThumbnails(filePath, image.id);
  } catch (err) {
    console.error(`[imageService] Thumbnail generation failed for image ${image.id}: ${err.message}`);
    // Continue — the original is still saved
  }

  // 5. Update record with thumbnail paths
  const updateData = {};
  if (thumbnails.thumb400) {
    updateData.thumbnailPath = getPublicUrl(thumbnails.thumb400);
  }
  if (thumbnails.thumb1200) {
    updateData.previewPath = getPublicUrl(thumbnails.thumb1200);
  }

  if (Object.keys(updateData).length > 0) {
    try {
      await image.update(updateData);
    } catch (err) {
      console.warn(`[imageService] Failed to update thumbnail paths: ${err.message}`);
    }
  }

  // 6. Handle tags if provided
  if (options.tags && Array.isArray(options.tags) && options.tags.length > 0) {
    try {
      await associateTags(image, options.tags);
    } catch (err) {
      console.warn(`[imageService] Tag association failed: ${err.message}`);
    }
  }

  // 7. Return full record with associations
  return Image.findByPk(image.id, {
    include: [{ model: Tag, through: { attributes: [] } }],
  });
}

/**
 * Associate tags (by name or ID) with an image.
 * @param {Image} image
 * @param {string[]|number[]} tags
 */
async function associateTags(image, tags) {
  const tagRecords = [];

  for (const tag of tags) {
    if (typeof tag === 'string') {
      const [tagRecord] = await Tag.findOrCreate({
        where: { name: tag.toLowerCase().trim() },
        defaults: { name: tag.toLowerCase().trim() },
      });
      tagRecords.push(tagRecord);
    } else if (typeof tag === 'number') {
      const tagRecord = await Tag.findByPk(tag);
      if (tagRecord) tagRecords.push(tagRecord);
    }
  }

  await image.setTags(tagRecords);
}

/**
 * Get a paginated list of images with optional tag filtering.
 * @param {Object} filters
 * @param {number} filters.page
 * @param {number} filters.limit
 * @param {string[]} filters.tags
 * @param {string} filters.status
 * @returns {Promise<{ images: Image[], total: number, page: number, pages: number }>}
 */
async function getImages(filters = {}) {
  const page = Math.max(1, parseInt(filters.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(filters.limit, 10) || 20));
  const offset = (page - 1) * limit;

  const where = {};

  if (filters.status) {
    where.status = filters.status;
  } else {
    where.status = 'active';
  }

  const queryOptions = {
    where,
    limit,
    offset,
    order: [['createdAt', 'DESC']],
    include: [{ model: Tag, through: { attributes: [] } }],
  };

  // Tag filtering
  if (filters.tags && filters.tags.length > 0) {
    const tagNames = Array.isArray(filters.tags) ? filters.tags : [filters.tags];
    queryOptions.include = [
      {
        model: Tag,
        through: { attributes: [] },
        where: { name: { [Op.in]: tagNames.map((t) => t.toLowerCase().trim()) } },
        required: true,
      },
    ];
  }

  const { count, rows } = await Image.findAndCountAll(queryOptions);

  return {
    images: rows,
    total: count,
    page,
    limit,
    pages: Math.ceil(count / limit),
  };
}

/**
 * Get a single image by ID with tags eager-loaded.
 * @param {number} id
 * @returns {Promise<Image|null>}
 */
async function getImageById(id) {
  return Image.findByPk(id, {
    include: [{ model: Tag, through: { attributes: [] } }],
  });
}

/**
 * Delete an image and all associated files.
 * @param {number} id
 * @returns {Promise<boolean>}
 */
async function deleteImage(id) {
  const image = await Image.findByPk(id);
  if (!image) return false;

  // Delete original file
  if (image.filePath) {
    const absolutePath = path.join(__dirname, '..', image.filePath);
    await safeDelete(absolutePath);
  }

  // Delete thumbnails
  await deleteThumbnails(id);

  // Remove DB record (cascade will handle ImageTag join records)
  await image.destroy();

  return true;
}

module.exports = { createImage, getImages, getImageById, deleteImage };