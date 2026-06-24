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
 * @param {Express.Multer.File} file - Multer file object
 * @param {Object} [options]
 * @param {string[]} [options.tags] - Array of tag names to associate
 * @param {string} [options.title] - Optional title override
 * @param {string} [options.description] - Optional description
 * @returns {Promise<Image>} Created Image instance with associations
 */
async function createImage(file, options = {}) {
  const { tags = [], title, description } = options;
  const filePath = file.path;
  const originalName = file.originalname;
  const mimeType = file.detectedMime || file.mimetype;
  const fileSize = file.size;
  const publicUrl = getPublicUrl(filePath);

  // 1. Extract EXIF metadata
  let exifData = {};
  try {
    exifData = await extractExif(filePath);
  } catch (err) {
    console.warn('[imageService] EXIF extraction failed, continuing without EXIF:', err.message);
  }

  // 2. Create initial DB record (need ID for thumbnails)
  let image;
  try {
    image = await Image.create({
      filename: path.basename(filePath),
      originalName,
      mimeType,
      fileSize,
      filePath: publicUrl,
      title: title || originalName,
      description: description || null,
      exifData: Object.keys(exifData).length > 0 ? exifData : null,
      width: exifData.width || null,
      height: exifData.height || null,
      cameraMake: exifData.cameraMake || null,
      cameraModel: exifData.cameraModel || null,
      dateTaken: exifData.dateTaken ? new Date(exifData.dateTaken) : null,
      gpsLat: exifData.gps ? exifData.gps.lat : null,
      gpsLng: exifData.gps ? exifData.gps.lng : null,
    });
  } catch (err) {
    // If DB create fails, clean up the uploaded file
    await safeDelete(filePath);
    throw err;
  }

  // 3. Generate thumbnails (partial failure is acceptable — log and continue)
  let thumbPaths = { thumb400: null, thumb1200: null };
  try {
    thumbPaths = await generateThumbnails(filePath, image.id);
  } catch (err) {
    console.error('[imageService] Thumbnail generation threw unexpectedly:', err.message);
  }

  // 4. Update DB record with thumbnail paths
  const updateData = {};
  if (thumbPaths.thumb400) {
    updateData.thumbnailPath = getPublicUrl(thumbPaths.thumb400);
  }
  if (thumbPaths.thumb1200) {
    updateData.largeThumbnailPath = getPublicUrl(thumbPaths.thumb1200);
  }

  if (Object.keys(updateData).length > 0) {
    await image.update(updateData);
  }

  // 5. Associate tags
  if (tags && tags.length > 0) {
    try {
      const tagInstances = await Promise.all(
        tags.map((name) =>
          Tag.findOrCreate({ where: { name: name.trim().toLowerCase() }, defaults: { name: name.trim().toLowerCase() } })
            .then(([tag]) => tag)
        )
      );
      await image.setTags(tagInstances);
    } catch (err) {
      console.warn('[imageService] Tag association failed:', err.message);
    }
  }

  // 6. Reload with associations
  const fullImage = await Image.findByPk(image.id, {
    include: [{ model: Tag, through: { attributes: [] } }],
  });

  return fullImage;
}

/**
 * Get a paginated list of images with optional tag filtering.
 *
 * @param {Object} [filters]
 * @param {number} [filters.page=1]
 * @param {number} [filters.limit=20]
 * @param {string[]} [filters.tags] - Filter by tag names
 * @param {string} [filters.search] - Search in title/description
 * @returns {Promise<{ rows: Image[], count: number, page: number, totalPages: number }>}
 */
async function getImages(filters = {}) {
  const { page = 1, limit = 20, tags = [], search } = filters;
  const offset = (page - 1) * limit;

  const where = {};
  if (search) {
    where[Op.or] = [
      { title: { [Op.like]: `%${search}%` } },
      { description: { [Op.like]: `%${search}%` } },
      { originalName: { [Op.like]: `%${search}%` } },
    ];
  }

  const includeOptions = [
    {
      model: Tag,
      through: { attributes: [] },
      ...(tags.length > 0 ? { where: { name: { [Op.in]: tags } } } : {}),
    },
  ];

  const { rows, count } = await Image.findAndCountAll({
    where,
    include: includeOptions,
    limit: parseInt(limit, 10),
    offset: parseInt(offset, 10),
    order: [['createdAt', 'DESC']],
    distinct: true,
  });

  return {
    rows,
    count,
    page: parseInt(page, 10),
    totalPages: Math.ceil(count / limit),
  };
}

/**
 * Get a single image by ID with tags eager-loaded.
 * @param {string|number} id
 * @returns {Promise<Image|null>}
 */
async function getImageById(id) {
  return Image.findByPk(id, {
    include: [{ model: Tag, through: { attributes: [] } }],
  });
}

/**
 * Delete an image and all associated files.
 * @param {string|number} id
 * @returns {Promise<boolean>} true if deleted, false if not found
 */
async function deleteImage(id) {
  const image = await Image.findByPk(id);
  if (!image) return false;

  // Delete physical files (swallow errors)
  const filesToDelete = [image.filePath, image.thumbnailPath, image.largeThumbnailPath].filter(Boolean);

  await Promise.allSettled(
    filesToDelete.map((urlPath) => {
      // Convert public URL back to absolute path
      const absPath = path.join(__dirname, '..', 'public', urlPath);
      // Try both: relative to public and relative to project root
      const altPath = path.join(__dirname, '..', urlPath);
      return safeDelete(altPath).then(() => safeDelete(absPath));
    })
  );

  // Delete thumbnails by ID
  await deleteThumbnails(id);

  // Delete DB record (cascades to ImageTag join table)
  await image.destroy();

  return true;
}

module.exports = { createImage, getImages, getImageById, deleteImage };