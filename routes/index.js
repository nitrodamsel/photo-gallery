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
    heroTitle: 'Your Personal Photo Gallery',
    heroSubtitle: 'Upload, organise, and explore your photos with ease.',
    features: [
      {
        icon: '🖼️',
        title: 'Smart Gallery',
        description: 'Browse your photos in a beautiful, responsive grid layout with smooth hover effects.',
      },
      {
        icon: '⬆️',
        title: 'Easy Uploads',
        description: 'Upload images in bulk. We automatically generate thumbnails and extract EXIF metadata.',
      },
      {
        icon: '🏷️',
        title: 'Tag & Search',
        description: 'Organise photos with custom tags and find exactly what you are looking for instantly.',
      },
      {
        icon: '📊',
        title: 'EXIF Insights',
        description: 'View detailed camera metadata: shutter speed, aperture, ISO, GPS coordinates, and more.',
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
 * Health-check endpoint — returns JSON status for monitoring and load balancers.
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
  });
});

module.exports = router;