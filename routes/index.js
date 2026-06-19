'use strict';

const express = require('express');
const router = express.Router();

/**
 * GET /
 * Renders the home page with placeholder data.
 */
router.get('/', (req, res) => {
  res.render('home', {
    title: 'Photo Gallery',
    heroTitle: 'Your Personal Photo Gallery',
    heroSubtitle: 'Upload, organise, and explore your photos with automatic EXIF data extraction and smart tagging.',
    features: [
      {
        icon: '📤',
        title: 'Easy Uploads',
        description: 'Drag-and-drop or browse to upload JPEG, PNG, GIF, and WebP images up to 10 MB each.',
      },
      {
        icon: '🏷️',
        title: 'Smart Tagging',
        description: 'Add custom tags to your photos and filter your gallery instantly.',
      },
      {
        icon: '📍',
        title: 'EXIF Data',
        description: 'Automatically extract camera settings, GPS coordinates, and timestamps from your photos.',
      },
      {
        icon: '🖼️',
        title: 'Responsive Gallery',
        description: 'A beautiful masonry-style grid that looks great on any device.',
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
 * Returns a JSON health-check response.
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: require('../package.json').version,
  });
});

module.exports = router;