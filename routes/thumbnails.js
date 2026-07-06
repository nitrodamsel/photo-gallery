const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const { Image } = require('../models');
const cacheMiddleware = require('../middleware/cache');

const VALID_SIZES = {
  small: { width: 200, height: 200 },
  medium: { width: 400, height: 400 },
  large: { width: 800, height: 800 },
  thumb: { width: 300, height: 300 },
};

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
const THUMBNAILS_DIR = path.join(UPLOADS_DIR, 'thumbnails');

// Ensure thumbnails directory exists
if (!fs.existsSync(THUMBNAILS_DIR)) {
  fs.mkdirSync(THUMBNAILS_DIR, { recursive: true });
}

/**
 * Get the thumbnail cache path for a given image ID and size.
 */
function getThumbnailPath(imageId, size) {
  return path.join(THUMBNAILS_DIR, `${imageId}_${size}.webp`);
}

/**
 * Generate a thumbnail using Sharp and save it to disk.
 */
async function generateThumbnail(sourcePath, destPath, size) {
  const dimensions = VALID_SIZES[size];
  await sharp(sourcePath)
    .rotate() // Auto-rotate based on EXIF orientation
    .resize(dimensions.width, dimensions.height, {
      fit: 'cover',
      position: 'centre',
      withoutEnlargement: true,
    })
    .webp({ quality: 82 })
    .toFile(destPath);
}

/**
 * Stream a file with proper caching headers.
 */
function streamWithCacheHeaders(req, res, filePath, mimeType = 'image/webp') {
  try {
    const stat = fs.statSync(filePath);
    const mtime = stat.mtime;
    const etag = `"${stat.size}-${mtime.getTime()}"`;

    res.setHeader('ETag', etag);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Last-Modified', mtime.toUTCString());
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', stat.size);

    // Check If-None-Match (ETag)
    const ifNoneMatch = req.headers['if-none-match'];
    if (ifNoneMatch && ifNoneMatch === etag) {
      return res.status(304).end();
    }

    // Check If-Modified-Since
    const ifModifiedSince = req.headers['if-modified-since'];
    if (ifModifiedSince) {
      const ifModifiedDate = new Date(ifModifiedSince);
      if (mtime <= ifModifiedDate) {
        return res.status(304).end();
      }
    }

    const stream = fs.createReadStream(filePath);
    stream.on('error', (err) => {
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to stream file' });
      }
    });
    stream.pipe(res);
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to read file' });
    }
  }
}

/**
 * GET /thumbnails/:size/:imageId
 * Serves a thumbnail for the given image at the given size.
 * Generates WebP thumbnail on first request, serves from disk cache thereafter.
 */
router.get('/:size/:imageId', async (req, res) => {
  const { size, imageId } = req.params;

  // Validate size
  if (!VALID_SIZES[size]) {
    return res.status(400).json({
      error: `Invalid size. Valid sizes: ${Object.keys(VALID_SIZES).join(', ')}`,
    });
  }

  // Validate imageId (UUID format)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(imageId)) {
    return res.status(400).json({ error: 'Invalid image ID format' });
  }

  try {
    // Check disk cache first
    const thumbnailPath = getThumbnailPath(imageId, size);
    if (fs.existsSync(thumbnailPath)) {
      return streamWithCacheHeaders(req, res, thumbnailPath, 'image/webp');
    }

    // Fetch image record from database
    const image = await Image.findOne({ where: { id: imageId } });
    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }

    // Resolve source file path
    const filename = image.filename || image.file_path;
    if (!filename) {
      return res.status(404).json({ error: 'Image file path not found' });
    }

    const sourcePath = path.isAbsolute(filename)
      ? filename
      : path.join(UPLOADS_DIR, path.basename(filename));

    if (!fs.existsSync(sourcePath)) {
      return res.status(404).json({ error: 'Image file not found on disk' });
    }

    // Generate thumbnail
    await generateThumbnail(sourcePath, thumbnailPath, size);

    // Stream the newly generated thumbnail
    return streamWithCacheHeaders(req, res, thumbnailPath, 'image/webp');
  } catch (err) {
    console.error(`[Thumbnails] Error serving thumbnail for ${imageId}:`, err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to generate thumbnail' });
    }
  }
});

module.exports = router;