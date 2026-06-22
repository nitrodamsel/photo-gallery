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
    heroHeadline: 'Your Personal Photo Gallery',
    heroSubtext: 'Upload, organise, and explore your photos with automatic EXIF data extraction and smart tagging.',
    features: [
      {
        icon: '🖼️',
        title: 'Beautiful Gallery',
        description: 'Browse your photos in a responsive masonry grid with smooth hover effects.',
      },
      {
        icon: '📤',
        title: 'Easy Uploads',
        description: 'Drag-and-drop or click-to-upload with automatic thumbnail generation.',
      },
      {
        icon: '🏷️',
        title: 'Smart Tagging',
        description: 'Organise photos with custom tags and filter your collection instantly.',
      },
      {
        icon: '📷',
        title: 'EXIF Data',
        description: 'Automatically extract camera settings, GPS coordinates, and timestamps.',
      },
    ],
  });
});

/**
 * GET /health
 * Health-check endpoint — returns JSON status for monitoring / load balancers.
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

module.exports = router;