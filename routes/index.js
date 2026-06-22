'use strict';

const express = require('express');
const router = express.Router();

/**
 * GET /
 * Renders the homepage with placeholder data.
 */
router.get('/', (req, res) => {
  res.render('home', {
    title: 'Photo Gallery',
    description: 'A beautiful place to organize and share your photos.',
    features: [
      {
        icon: '🖼️',
        heading: 'Smart Gallery',
        body: 'Browse your photos in a responsive, masonry-style grid with smooth hover effects.',
      },
      {
        icon: '📤',
        heading: 'Easy Upload',
        body: 'Drag-and-drop or click to upload images. Supports JPEG, PNG, WebP, and more.',
      },
      {
        icon: '🏷️',
        heading: 'Tag & Organize',
        body: 'Add custom tags to every photo so you can filter and find them in seconds.',
      },
      {
        icon: '📷',
        heading: 'EXIF Metadata',
        body: 'Automatically extracts camera model, aperture, shutter speed, GPS, and more.',
      },
      {
        icon: '✂️',
        heading: 'Image Processing',
        body: 'Generates optimized thumbnails and strips sensitive metadata on the fly.',
      },
      {
        icon: '🔍',
        heading: 'Powerful Search',
        body: 'Full-text search across titles, descriptions, and tags to find any photo fast.',
      },
    ],
    stats: {
      photos: 0,
      tags: 0,
      uploads: 0,
    },
  });
});

/**
 * GET /health
 * Health-check endpoint — returns JSON status for monitoring tools.
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
  });
});

module.exports = router;