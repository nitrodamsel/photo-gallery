const path = require('path');
const fs = require('fs').promises;
const sharp = require('sharp');
const { ThumbnailCache } = require('../models');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
const THUMBNAIL_SIZES = {
  small: { width: 200, height: 200 },
  medium: { width: 400, height: 400 },
  large: { width: 800, height: 800 }
};

/**
 * Apply rotation to a sharp instance
 */
function applyRotation(sharpInstance, rotation) {
  const rot = ((parseInt(rotation, 10) || 0) % 360 + 360) % 360;
  if (rot === 0) return sharpInstance;
  return sharpInstance.rotate(rot);
}

/**
 * Generate a thumbnail for a given image and size
 */
async function generateThumbnail(image, sizeName, uploadDir) {
  const dir = uploadDir || UPLOADS_DIR;
  const sizeConfig = THUMBNAIL_SIZES[sizeName];
  if (!sizeConfig) {
    throw new Error(`Unknown thumbnail size: ${sizeName}`);
  }

  const sourcePath = path.join(dir, image.filename);
  const rotation = image.rotation || 0;
  const thumbFilename = `thumb_${sizeName}_${image.filename}`;
  const thumbPath = path.join(dir, thumbFilename);

  let pipeline = sharp(sourcePath);
  pipeline = applyRotation(pipeline, rotation);
  pipeline = pipeline
    .resize(sizeConfig.width, sizeConfig.height, { fit: 'cover', position: 'center' })
    .jpeg({ quality: 85 });

  await pipeline.toFile(thumbPath);

  // Upsert thumbnail cache record
  const [thumbRecord] = await ThumbnailCache.findOrCreate({
    where: { imageId: image.id, size: sizeName },
    defaults: {
      imageId: image.id,
      size: sizeName,
      filename: thumbFilename,
      width: sizeConfig.width,
      height: sizeConfig.height
    }
  });

  if (thumbRecord.filename !== thumbFilename) {
    await thumbRecord.update({ filename: thumbFilename });
  }

  return thumbRecord;
}

/**
 * Generate all thumbnail sizes for an image
 */
async function generateAllThumbnails(image, uploadDir) {
  const results = {};
  for (const sizeName of Object.keys(THUMBNAIL_SIZES)) {
    try {
      results[sizeName] = await generateThumbnail(image, sizeName, uploadDir);
    } catch (err) {
      console.error(`Failed to generate ${sizeName} thumbnail for image ${image.id}:`, err);
    }
  }
  return results;
}

/**
 * Regenerate all thumbnails (e.g., after rotation change or server move)
 */
async function regenerateThumbnails(image, uploadDir) {
  const dir = uploadDir || UPLOADS_DIR;

  // Delete existing thumbnail files
  for (const sizeName of Object.keys(THUMBNAIL_SIZES)) {
    const thumbFilename = `thumb_${sizeName}_${image.filename}`;
    const thumbPath = path.join(dir, thumbFilename);
    try {
      await fs.unlink(thumbPath);
    } catch (err) {
      if (err.code !== 'ENOENT') {
        console.error(`Failed to delete old thumbnail ${thumbFilename}:`, err);
      }
    }
  }

  // Regenerate
  return await generateAllThumbnails(image, dir);
}

/**
 * Get thumbnail URL for an image at a given size
 */
function getThumbnailUrl(image, sizeName) {
  const thumbFilename = `thumb_${sizeName}_${image.filename}`;
  return `/uploads/${thumbFilename}`;
}

/**
 * Serve an image with rotation applied (for full-size serving)
 */
async function serveRotatedImage(image, outputStream, uploadDir) {
  const dir = uploadDir || UPLOADS_DIR;
  const sourcePath = path.join(dir, image.filename);
  const rotation = image.rotation || 0;

  let pipeline = sharp(sourcePath);
  pipeline = applyRotation(pipeline, rotation);

  await pipeline.pipe(outputStream);
}

module.exports = {
  generateThumbnail,
  generateAllThumbnails,
  regenerateThumbnails,
  getThumbnailUrl,
  serveRotatedImage,
  THUMBNAIL_SIZES
};