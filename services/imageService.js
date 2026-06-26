const db = require('../config/database');
const thumbnailService = require('./thumbnailService');
const exifService = require('./exifService');
const path = require('path');
const fs = require('fs');

/**
 * Get a paginated list of images with optional tag filter.
 */
async function getImages({ limit = 12, offset = 0, tag = null } = {}) {
  let query;
  let countQuery;
  let params;
  let countParams;

  if (tag) {
    query = `
      SELECT i.*
      FROM images i
      INNER JOIN image_tags it ON it.image_id = i.id
      INNER JOIN tags t ON t.id = it.tag_id
      WHERE t.slug = ?
      ORDER BY i.id DESC
      LIMIT ? OFFSET ?
    `;
    countQuery = `
      SELECT COUNT(DISTINCT i.id) as total
      FROM images i
      INNER JOIN image_tags it ON it.image_id = i.id
      INNER JOIN tags t ON t.id = it.tag_id
      WHERE t.slug = ?
    `;
    params = [tag, limit, offset];
    countParams = [tag];
  } else {
    query = `
      SELECT i.*
      FROM images i
      ORDER BY i.id DESC
      LIMIT ? OFFSET ?
    `;
    countQuery = `SELECT COUNT(*) as total FROM images`;
    params = [limit, offset];
    countParams = [];
  }

  const [images, countResult] = await Promise.all([
    db.all(query, params),
    db.get(countQuery, countParams),
  ]);

  // Attach tags to each image
  for (const image of images) {
    image.tags = await getImageTags(image.id);
    image.thumbnailUrl = getThumbnailUrl(image, 400);
  }

  return {
    images,
    total: countResult ? countResult.total : 0,
  };
}

/**
 * Get a single image by ID with full metadata.
 */
async function getImageById(id) {
  const image = await db.get('SELECT * FROM images WHERE id = ?', [id]);
  if (!image) return null;

  image.tags = await getImageTags(image.id);
  image.thumbnailUrl = getThumbnailUrl(image, 1200);
  image.thumbnailUrl400 = getThumbnailUrl(image, 400);

  // Parse EXIF data if stored as JSON string
  if (image.exif_data && typeof image.exif_data === 'string') {
    try {
      image.exif_data = JSON.parse(image.exif_data);
    } catch (e) {
      image.exif_data = null;
    }
  }

  // Parse GPS data
  if (image.gps_latitude && image.gps_longitude) {
    image.hasGPS = true;
  } else if (image.exif_data) {
    const exif = image.exif_data;
    image.gps_latitude = image.gps_latitude || exif.GPSLatitude || exif.gps_latitude || null;
    image.gps_longitude = image.gps_longitude || exif.GPSLongitude || exif.gps_longitude || null;
    image.hasGPS = !!(image.gps_latitude && image.gps_longitude);
  }

  return image;
}

/**
 * Get the previous image (lower id) relative to given id.
 */
async function getPrevImage(id) {
  return db.get('SELECT id, original_filename FROM images WHERE id < ? ORDER BY id DESC LIMIT 1', [id]);
}

/**
 * Get the next image (higher id) relative to given id.
 */
async function getNextImage(id) {
  return db.get('SELECT id, original_filename FROM images WHERE id > ? ORDER BY id ASC LIMIT 1', [id]);
}

/**
 * Get tags for an image.
 */
async function getImageTags(imageId) {
  return db.all(
    `SELECT t.id, t.name, t.slug
     FROM tags t
     INNER JOIN image_tags it ON it.tag_id = t.id
     WHERE it.image_id = ?
     ORDER BY t.name ASC`,
    [imageId]
  );
}

/**
 * Build a thumbnail URL for an image at a given size.
 */
function getThumbnailUrl(image, size) {
  if (!image) return null;
  // Try to return a path based on known filename
  const filename = image.filename || image.original_filename;
  if (!filename) return null;

  // Check for stored thumbnail path
  if (size <= 400 && image.thumbnail_path) {
    return '/' + image.thumbnail_path.replace(/\\/g, '/');
  }

  // Fallback: use original upload
  if (image.file_path) {
    return '/' + image.file_path.replace(/\\/g, '/');
  }

  return `/uploads/${filename}`;
}

/**
 * Add a tag to an image.
 */
async function addTagToImage(imageId, tagId) {
  await db.run(
    'INSERT OR IGNORE INTO image_tags (image_id, tag_id) VALUES (?, ?)',
    [imageId, tagId]
  );
}

/**
 * Remove a tag from an image.
 */
async function removeTagFromImage(imageId, tagId) {
  await db.run(
    'DELETE FROM image_tags WHERE image_id = ? AND tag_id = ?',
    [imageId, tagId]
  );
}

/**
 * Get all available tags.
 */
async function getAllTags() {
  return db.all('SELECT * FROM tags ORDER BY name ASC');
}

module.exports = {
  getImages,
  getImageById,
  getPrevImage,
  getNextImage,
  getImageTags,
  addTagToImage,
  removeTagFromImage,
  getAllTags,
};