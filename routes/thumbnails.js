const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const { Image } = require('../models');
const { generateETag } = require('../middleware/cache');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');

const THUMBNAIL_SIZES = {
  small: { width: 200, height: 200 },
  medium: { width: 400, height: 400 },
  large: { width: 800, height: 800 },
  thumb: { width: 200, height: 200 },
};

const THUMBNAIL_CACHE_DIR = path.join(__dirname, '..', 'uploads', 'thumbnails');

// Ensure thumbnail cache directory exists
if (!fs.existsSync(THUMBNAIL_CACHE_DIR)) {
  fs.mkdirSync(THUMBNAIL_CACHE_DIR, { recursive: true });
}

/**
 * GET /thumbnails/:size/:imageId
 * Serves a thumbnail for the given image at the specified size.
 * Sets aggressive Cache-Control and ETag headers.
 * Converts to WebP for better performance.
 */
router.get('/:size/:imageId', async (req, res, next) => {
  const { size, imageId } = req.params;

  // Validate size
  const dimensions = THUMBNAIL_SIZES[size];
  if (!dimensions) {
    return res.status(400).json({
      error: `Invalid size. Must be one of: ${Object.keys(THUMBNAIL_SIZES).join(', ')}`,
    });
  }

  try {
    // Look up image in database
    const image = await Image.findOne({ where: { id: imageId } });
    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }

    // Determine original file path
    const filename = image.filename || image.file_path;
    if (!filename) {
      return res.status(404).json({ error: 'Image file not found' });
    }

    const originalPath = path.join(UPLOAD_DIR, path.basename(filename));

    // Check original file exists
    if (!fs.existsSync(originalPath)) {
      return res.status(404).json({ error: 'Image file not found on disk' });
    }

    // Thumbnail cache path: uploads/thumbnails/{size}_{imageId}.webp
    const thumbnailFilename = `${size}_${imageId}.webp`;
    const thumbnailPath = path.join(THUMBNAIL_CACHE_DIR, thumbnailFilename);

    // Check if cached thumbnail exists
    let servePath = thumbnailPath;
    let needsGeneration = true;

    if (fs.existsSync(thumbnailPath)) {
      // Check if thumbnail is newer than original
      const origStats = fs.statSync(originalPath);
      const thumbStats = fs.statSync(thumbnailPath);
      if (thumbStats.mtimeMs >= origStats.mtimeMs) {
        needsGeneration = false;
      }
    }

    if (needsGeneration) {
      // Generate thumbnail with Sharp, convert to WebP
      await sharp(originalPath)
        .resize(dimensions.width, dimensions.height, {
          fit: 'cover',
          position: 'centre',
          withoutEnlargement: true,
        })
        .webp({ quality: 82, effort: 4 })
        .toFile(thumbnailPath);
    }

    // Get file stats for ETag
    const stats = fs.statSync(thumbnailPath);
    const etag = generateETag(stats);
    const ifNoneMatch = req.headers['if-none-match'];

    // ETag check — 304 Not Modified
    if (ifNoneMatch && ifNoneMatch === etag) {
      return res.status(304).end();
    }

    // Set caching headers
    res.setHeader('ETag', etag);
    res.setHeader('Last-Modified', stats.mtime.toUTCString());
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Content-Type', 'image/webp');
    res.setHeader('Content-Length', stats.size);
    res.setHeader('Vary', 'Accept-Encoding');

    // Stream thumbnail to response
    const readStream = fs.createReadStream(thumbnailPath);
    readStream.on('error', (err) => {
      console.error('Error streaming thumbnail:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error serving thumbnail' });
      }
    });
    readStream.pipe(res);

  } catch (err) {
    console.error('Thumbnail error:', err);
    next(err);
  }
});

/**
 * DELETE /thumbnails/cache/:imageId
 * Purge cached thumbnails for a specific image (all sizes).
 */
router.delete('/cache/:imageId', async (req, res) => {
  const { imageId } = req.params;

  try {
    let deleted = 0;
    for (const size of Object.keys(THUMBNAIL_SIZES)) {
      const thumbnailPath = path.join(THUMBNAIL_CACHE_DIR, `${size}_${imageId}.webp`);
      if (fs.existsSync(thumbnailPath)) {
        fs.unlinkSync(thumbnailPath);
        deleted++;
      }
    }
    res.json({ success: true, deleted, imageId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;