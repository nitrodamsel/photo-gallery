const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const { ThumbnailCache } = require('../models');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
const THUMB_DIR = path.join(UPLOAD_DIR, 'thumbnails');

// Ensure thumbnail directory exists
if (!fs.existsSync(THUMB_DIR)) {
  fs.mkdirSync(THUMB_DIR, { recursive: true });
}

const THUMBNAIL_SIZES = {
  small: { width: 200, height: 200 },
  medium: { width: 400, height: 400 },
  large: { width: 800, height: 800 }
};

/**
 * Generate a thumbnail for an image at a given size
 */
async function generateThumbnail(image, size = 'medium') {
  const dimensions = THUMBNAIL_SIZES[size];
  if (!dimensions) throw new Error(`Unknown thumbnail size: ${size}`);

  const sourcePath = path.join(UPLOAD_DIR, image.filename);
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Source file not found: ${sourcePath}`);
  }

  const thumbFilename = `${path.parse(image.filename).name}_${size}.webp`;
  const thumbPath = path.join(THUMB_DIR, thumbFilename);

  let pipeline = sharp(sourcePath);

  // Apply rotation if set
  const rotation = image.rotation || 0;
  if (rotation !== 0) {
    pipeline = pipeline.rotate(rotation);
  }

  // Apply horizontal flip if set
  if (image.flipH) {
    pipeline = pipeline.flop();
  }

  pipeline = pipeline.resize(dimensions.width, dimensions.height, {
    fit: 'inside',
    withoutEnlargement: true
  }).webp({ quality: 85 });

  await pipeline.toFile(thumbPath);

  return thumbFilename;
}

/**
 * Regenerate all thumbnail sizes for an image
 */
async function regenerateThumbnails(image) {
  const results = {};

  for (const size of Object.keys(THUMBNAIL_SIZES)) {
    try {
      const thumbFilename = await generateThumbnail(image, size);
      results[size] = thumbFilename;

      // Update or create cache record
      await ThumbnailCache.upsert({
        imageId: image.id,
        size,
        filename: thumbFilename,
        generatedAt: new Date()
      });
    } catch (err) {
      console.error(`Failed to generate ${size} thumbnail for image ${image.id}:`, err);
      throw err;
    }
  }

  return results;
}

/**
 * Get thumbnail path for an image, generating if needed
 */
async function getThumbnail(image, size = 'medium') {
  const thumbFilename = `${path.parse(image.filename).name}_${size}.webp`;
  const thumbPath = path.join(THUMB_DIR, thumbFilename);

  if (!fs.existsSync(thumbPath)) {
    await generateThumbnail(image, size);
  }

  return thumbFilename;
}

/**
 * Delete all thumbnails for an image
 */
async function deleteThumbnails(image) {
  for (const size of Object.keys(THUMBNAIL_SIZES)) {
    const thumbFilename = `${path.parse(image.filename).name}_${size}.webp`;
    const thumbPath = path.join(THUMB_DIR, thumbFilename);

    if (fs.existsSync(thumbPath)) {
      fs.unlinkSync(thumbPath);
    }
  }

  await ThumbnailCache.destroy({ where: { imageId: image.id } });
}

module.exports = {
  generateThumbnail,
  regenerateThumbnails,
  getThumbnail,
  deleteThumbnails,
  THUMBNAIL_SIZES,
  THUMB_DIR
};