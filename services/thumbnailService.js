const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const Image = require('../models/Image');
const ThumbnailCache = require('../models/ThumbnailCache');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
const THUMBNAILS_DIR = path.join(UPLOADS_DIR, 'thumbnails');

// Ensure thumbnails directory exists
if (!fs.existsSync(THUMBNAILS_DIR)) {
  fs.mkdirSync(THUMBNAILS_DIR, { recursive: true });
}

const THUMBNAIL_SIZES = {
  small: { width: 200, height: 200 },
  medium: { width: 400, height: 400 },
  large: { width: 800, height: 800 }
};

/**
 * Apply rotation to a Sharp instance
 * @param {sharp.Sharp} sharpInstance
 * @param {number} rotation - degrees (0, 90, 180, 270) or string with flip
 */
function applyTransform(sharpInstance, rotation) {
  if (!rotation && rotation !== 0) return sharpInstance;

  const rot = parseInt(rotation, 10);
  if (rot === 0) return sharpInstance;
  if (rot === 90) return sharpInstance.rotate(90);
  if (rot === 180) return sharpInstance.rotate(180);
  if (rot === 270) return sharpInstance.rotate(270);

  return sharpInstance;
}

/**
 * Generate a thumbnail for an image at a given size
 */
async function generateThumbnail(imagePath, outputPath, size, rotation = 0) {
  const { width, height } = THUMBNAIL_SIZES[size] || THUMBNAIL_SIZES.medium;

  let pipeline = sharp(imagePath);

  // Apply rotation before resizing
  if (rotation && rotation !== 0) {
    pipeline = applyTransform(pipeline, rotation);
  }

  await pipeline
    .resize(width, height, {
      fit: 'inside',
      withoutEnlargement: true
    })
    .jpeg({ quality: 85 })
    .toFile(outputPath);
}

/**
 * Get or generate a thumbnail, returning the path
 */
async function getThumbnail(imageId, size = 'medium') {
  const image = await Image.findByPk(imageId);
  if (!image) throw new Error('Image not found');

  const rotation = image.rotation || 0;
  const cacheKey = `${imageId}_${size}_r${rotation}`;

  // Check cache
  const cached = await ThumbnailCache.findOne({
    where: { imageId, size, cacheKey }
  });

  if (cached && fs.existsSync(cached.thumbnailPath)) {
    return cached.thumbnailPath;
  }

  // Generate thumbnail
  const imagePath = path.join(UPLOADS_DIR, image.filename);
  if (!fs.existsSync(imagePath)) {
    throw new Error('Original image file not found');
  }

  const ext = '.jpg';
  const thumbFilename = `${imageId}_${size}_r${rotation}${ext}`;
  const thumbPath = path.join(THUMBNAILS_DIR, thumbFilename);

  await generateThumbnail(imagePath, thumbPath, size, rotation);

  // Update or create cache record
  if (cached) {
    await cached.update({ thumbnailPath: thumbPath, cacheKey });
  } else {
    await ThumbnailCache.create({
      imageId,
      size,
      thumbnailPath: thumbPath,
      cacheKey
    });
  }

  return thumbPath;
}

/**
 * Regenerate all thumbnails for an image (clears old cache entries)
 */
async function regenerateThumbnails(imageId) {
  const image = await Image.findByPk(imageId);
  if (!image) throw new Error('Image not found');

  const imagePath = path.join(UPLOADS_DIR, image.filename);
  if (!fs.existsSync(imagePath)) {
    throw new Error('Original image file not found');
  }

  const rotation = image.rotation || 0;

  // Delete old thumbnail files and cache records
  const oldCaches = await ThumbnailCache.findAll({ where: { imageId } });
  for (const cache of oldCaches) {
    if (fs.existsSync(cache.thumbnailPath)) {
      try {
        fs.unlinkSync(cache.thumbnailPath);
      } catch (e) {
        console.warn(`Could not delete old thumbnail: ${cache.thumbnailPath}`);
      }
    }
    await cache.destroy();
  }

  // Generate new thumbnails for all sizes
  const results = {};
  for (const size of Object.keys(THUMBNAIL_SIZES)) {
    const cacheKey = `${imageId}_${size}_r${rotation}`;
    const thumbFilename = `${imageId}_${size}_r${rotation}.jpg`;
    const thumbPath = path.join(THUMBNAILS_DIR, thumbFilename);

    await generateThumbnail(imagePath, thumbPath, size, rotation);

    await ThumbnailCache.create({
      imageId,
      size,
      thumbnailPath: thumbPath,
      cacheKey
    });

    results[size] = thumbPath;
  }

  return results;
}

/**
 * Get the served URL path for a thumbnail
 */
function getThumbnailUrl(filename) {
  return `/uploads/thumbnails/${filename}`;
}

/**
 * Delete all thumbnails for an image
 */
async function deleteThumbnails(imageId) {
  const caches = await ThumbnailCache.findAll({ where: { imageId } });
  for (const cache of caches) {
    if (fs.existsSync(cache.thumbnailPath)) {
      try {
        fs.unlinkSync(cache.thumbnailPath);
      } catch (e) {
        console.warn(`Could not delete thumbnail: ${cache.thumbnailPath}`);
      }
    }
    await cache.destroy();
  }
}

module.exports = {
  getThumbnail,
  generateThumbnail,
  regenerateThumbnails,
  deleteThumbnails,
  getThumbnailUrl,
  THUMBNAIL_SIZES,
  THUMBNAILS_DIR
};