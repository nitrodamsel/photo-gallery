'use strict';

const express = require('express');
const router = express.Router();

/**
 * GET /
 * Renders the home / landing page.
 */
router.get('/', (req, res) => {
  res.render('home', {
    title: 'Photo Gallery',
    tagline: 'Upload, organise, and explore your photos with ease.',
    features: [
      {
        icon: '🖼️',
        heading: 'Beautiful Gallery',
        body: 'Browse your photos in a responsive masonry grid with smooth hover effects.',
      },
      {
        icon: '🏷️',
        heading: 'Smart Tagging',
        body: 'Organise images with custom tags and filter your collection in seconds.',
      },
      {
        icon: '📷',
        heading: 'EXIF Metadata',
        body: 'Automatically extract camera settings, GPS coordinates, and more from every photo.',
      },
      {
        icon: '⚡',
        heading: 'Fast Uploads',
        body: 'Drag-and-drop upload with automatic thumbnail generation powered by Sharp.',
      },
    ],
  });
});

/**
 * GET /health
 * Health-check endpoint — useful for uptime monitors and container orchestration.
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

module.exports = router;