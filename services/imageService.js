const path = require('path');
const { Op } = require('sequelize');
const { Image, Tag, ImageTag } = require('../models');
const { extractExif } = require('./exifService');
const { generateThumbnails, deleteThumbnails } = require('./thumbnailService');
const { safeDelete, getPublicUrl } = require('../utils/fileHelpers');

/**
 * Create a new image record from an uploaded file.
 *
 * @param {Object} file - Multer file object
 * @param {Object} [options] - Additional options
 * @param {string[]} [options.tags] - Array of tag names to associate
 * @param {string} [options.title] - Override title (defaults to original filename)
 * @param {string} [options.description] - Image description
 * @returns {Promise<Image>} The created Image record with associations
 */
async function createImage(file, options = {}) {
  const filePath = file.path;
  let imageRecord = null;

  try {
    // 1. Extract EXIF metadata
    const exifData = await extractExif(filePath);

    // 2. Build the image record data
    const imageData = {
      originalFilename: file.originalname,
      filename: file.filename,
      filePath: filePath,
      fileSize: file.size,
      mimeType: file.detectedMimeType || file.mimetype,
      publicUrl: getPublicUrl(filePath),
      title: options.title || path.basename(file.originalname, path.extname(file.originalname)),
      description: options.description || null,
      exifData: Object.keys(exifData).length > 0 ? exifData : null,
      width: exifData.width || null,
      height: exifData.height || null,
      cameraMake: exifData.cameraMake || null,
      cameraModel: exifData.cameraModel || null,
      dateTaken: exifData.dateTaken || null,
      latitude: exifData.gps ? exifData.gps.lat : null,
      longitude: exifData.gps ? exifData.gps.lng : null,
    };

    // 3. Create the database record
    imageRecord = await Image.create(imageData);

    // 4. Generate thumbnails (partial failure is OK — log and continue)
    try {
      const thumbnails = await generateThumbnails(filePath, imageRecord.id);

      const updateData = {};
      if (thumbnails.thumb400) {
        updateData.thumbnailSmall = getPublicUrl(thumbnails.thumb400);
      }
      if (thumbnails.thumb1200) {
        updateData.thumbnailLarge = getPublicUrl(thumbnails.thumb1200);
      }

      if (Object.keys(updateData).length > 0) {
        await imageRecord.update(updateData);
      }
    } catch (thumbErr) {
      console.error(
        '[imageService] Thumbnail generation failed (non-fatal):',
        thumbErr.message
      );
    }

    // 5. Associate tags if provided
    if (options.tags && options.tags.length > 0) {
      await associateTags(imageRecord, options.tags);
    }

    // 6. Return the full record with associations
    return getImageById(imageRecord.id);
  } catch (err) {
    // If the DB record was created but something else failed, don't clean up the file
    // — we want to preserve the original. Log the error and re-throw.
    console.error('[imageService] createImage error:', err.message);
    throw err;
  }
}

/**
 * Associate tags with an image, creating tags that don't exist yet.
 *
 * @param {Image} imageRecord
 * @param {string[]} tagNames
 */
async function associateTags(imageRecord, tagNames) {
  for (const name of tagNames) {
    const trimmed = name.trim().toLowerCase();
    if (!trimmed) continue;

    const [tag] = await Tag.findOrCreate({
      where: { name: trimmed },
      defaults: { name: trimmed },
    });

    await ImageTag.findOrCreate({
      where: { imageId: imageRecord.id, tagId: tag.id },
    });
  }
}

/**
 * Get a paginated list of images, with optional tag filtering.
 *
 * @param {Object} [filters]
 * @param {number} [filters.page=1] - 1-indexed page number
 * @param {number} [filters.limit=20] - Items per page
 * @param {string[]} [filters.tags] - Filter by tag names (AND logic)
 * @param {string} [filters.search] - Search in title/description
 * @returns {Promise<{ rows: Image[], count: number, totalPages: number, page: number }>}
 */
async function getImages(filters = {}) {
  const page = Math.max(1, parseInt(filters.page || 1, 10));
  const limit = Math.min(100, Math.max(1, parseInt(filters.limit || 20, 10)));
  const offset = (page - 1) * limit;

  const where = {};

  if (filters.search) {
    where[Op.or] = [
      { title: { [Op.like]: `%${filters.search}%` } },
      { description: { [Op.like]: `%${filters.search}%` } },
      { originalFilename: { [Op.like]: `%${filters.search}%` } },
    ];
  }

  const queryOptions = {
    where,
    limit,
    offset,
    order: [['createdAt', 'DESC']],
    include: [
      {
        model: Tag,
        through: { attributes: [] },
        as: 'tags',
      },
    ],
    distinct: true,
  };

  // Tag filtering: only include images that have ALL specified tags
  if (filters.tags && filters.tags.length > 0) {
    queryOptions.include[0].where = {
      name: { [Op.in]: filters.tags.map((t) => t.toLowerCase()) },
    };
    queryOptions.include[0].required = true;
  }

  const { rows, count } = await Image.findAndCountAll(queryOptions);

  return {
    rows,
    count,
    page,
    limit,
    totalPages: Math.ceil(count / limit),
  };
}

/**
 * Get a single image by ID with all associations eager-loaded.
 *
 * @param {string|number} id
 * @returns {Promise<Image|null>}
 */
async function getImageById(id) {
  return Image.findByPk(id, {
    include: [
      {
        model: Tag,
        through: { attributes: [] },
        as: 'tags',
      },
    ],
  });
}

/**
 * Delete an image: removes the DB record and all associated files.
 *
 * @param {string|number} id
 * @returns {Promise<boolean>} true if deleted, false if not found
 */
async function deleteImage(id) {
  const image = await Image.findByPk(id);
  if (!image) return false;

  // Remove original file
  await safeDelete(image.filePath);

  // Remove thumbnails
  await deleteThumbnails(id);

  // Remove DB record (cascades to ImageTag junction)
  await image.destroy();

  return true;
}

module.exports = { createImage, getImages, getImageById, deleteImage };