const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const { Image } = require('../models');
const { setFileHeaders, checkNotModified } = require('../middleware/cache');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');

const SIZE_MAP = {
  small: { width: 200, height: 200 },
  medium: { width: 400, height: 400 },
  large: { width: 800, height: 800 },
  thumb: { width: 150, height: 150 },
};

/**
 * GET /thumbnails/:size/:imageId
 * Serves a resized thumbnail for the given image.
 * Sets aggressive Cache-Control headers (1 year, immutable).
 * Supports ETag-based 304 Not Modified responses.
 */
router.get('/:size/:imageId', async (req, res) => {
  const { size, imageId } = req.params;

  const dimensions = SIZE_MAP[size];
  if (!dimensions) {
    return res.status(400).json({
      error: `Invalid size. Valid sizes: ${Object.keys(SIZE_MAP).join(', ')}`,
    });
  }

  try {
    // Look up image record
    const image = await Image.findByPk(imageId);
    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }

    const originalPath = path.join(UPLOAD_DIR, image.filename);

    if (!fs.existsSync(originalPath)) {
      return res.status(404).json({ error: 'Image file not found on disk' });
    }

    // Build thumbnail cache path
    const thumbnailDir = path.join(UPLOAD_DIR, 'thumbnails', size);
    const thumbnailFilename = `${imageId}.webp`;
    const thumbnailPath = path.join(thumbnailDir, thumbnailFilename);

    // Ensure thumbnail directory exists
    if (!fs.existsSync(thumbnailDir)) {
      fs.mkdirSync(thumbnailDir, { recursive: true });
    }

    // Generate thumbnail if it doesn't exist
    if (!fs.existsSync(thumbnailPath)) {
      await sharp(originalPath)
        .resize(dimensions.width, dimensions.height, {
          fit: 'cover',
          position: 'center',
          withoutEnlargement: true,
        })
        .webp({ quality: 82, effort: 4 })
        .toFile(thumbnailPath);
    }

    // Set ETag and Cache-Control headers
    const etag = setFileHeaders(thumbnailPath, res, 31536000);

    // Check if client has a fresh copy
    if (checkNotModified(req, res, etag)) {
      return;
    }

    // Stream the thumbnail
    res.setHeader('Content-Type', 'image/webp');
    const stream = fs.createReadStream(thumbnailPath);
    stream.on('error', (err) => {
      console.error('Error streaming thumbnail:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to serve thumbnail' });
      }
    });
    stream.pipe(res);
  } catch (err) {
    console.error('Thumbnail route error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

/**
 * DELETE /thumbnails/cache/:imageId
 * Purges all cached thumbnails for a specific image.
 */
router.delete('/cache/:imageId', async (req, res) => {
  const { imageId } = req.params;

  try {
    let deletedCount = 0;
    for (const size of Object.keys(SIZE_MAP)) {
      const thumbnailPath = path.join(
        UPLOAD_DIR,
        'thumbnails',
        size,
        `${imageId}.webp`
      );
      if (fs.existsSync(thumbnailPath)) {
        fs.unlinkSync(thumbnailPath);
        deletedCount++;
      }
    }

    res.json({
      success: true,
      message: `Purged ${deletedCount} thumbnail(s) for image ${imageId}`,
    });
  } catch (err) {
    console.error('Thumbnail cache purge error:', err);
    res.status(500).json({ error: 'Failed to purge thumbnail cache' });
  }
});

module.exports = router;