'use strict';

const express = require('express');
const router = express.Router();
const config = require('../config');

// GET / — Render home page
router.get('/', (req, res) => {
  res.render('home', {
    title: 'Photo Gallery',
    tagline: 'Your personal photo collection, beautifully organized.',
    features: [
      {
        icon: '🖼️',
        title: 'Gallery View',
        description: 'Browse all your photos in a responsive masonry grid with smooth hover effects.',
      },
      {
        icon: '📤',
        title: 'Easy Upload',
        description: 'Upload single or multiple images with automatic EXIF data extraction.',
      },
      {
        icon: '🏷️',
        title: 'Tag & Organize',
        description: 'Add custom tags to photos and filter your gallery by any combination of tags.',
      },
      {
        icon: '🔍',
        title: 'Smart Search',
        description: 'Search across filenames, descriptions, and tags to find any photo instantly.',
      },
    ],
    stats: {
      photos: 0,
      tags: 0,
      uploads: 0,
    },
  });
});

// GET /health — Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
    version: process.env.npm_package_version || '1.0.0',
    uptime: process.uptime(),
  });
});

module.exports = router;