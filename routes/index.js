'use strict';

const express = require('express');
const router = express.Router();

// GET / — Landing page
router.get('/', (req, res) => {
  res.render('home', {
    title: 'Photo Gallery',
    heroHeadline: 'Your Personal Photo Gallery',
    heroSubtitle:
      'Upload, organise, and explore your photos with automatic EXIF data extraction and powerful tagging.',
    features: [
      {
        icon: '📤',
        title: 'Easy Uploads',
        description:
          'Drag-and-drop or browse to upload JPEG, PNG, WebP, and HEIC images up to 10 MB each.',
      },
      {
        icon: '🏷️',
        title: 'Smart Tagging',
        description:
          'Tag your photos to keep them organised and find exactly what you need in seconds.',
      },
      {
        icon: '📷',
        title: 'EXIF Extraction',
        description:
          'Automatically capture camera make, model, aperture, shutter speed, ISO, and GPS data.',
      },
      {
        icon: '🖼️',
        title: 'Gallery View',
        description:
          'Browse your collection in a responsive masonry-style grid with smooth hover effects.',
      },
    ],
  });
});

// GET /health — Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  });
});

module.exports = router;