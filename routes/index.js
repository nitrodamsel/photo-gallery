'use strict';

const express = require('express');
const router = express.Router();

// GET / - Home page
router.get('/', (req, res) => {
  res.render('home', {
    title: 'Photo Gallery',
    description: 'A beautiful gallery to showcase and manage your photos.',
    features: [
      {
        icon: '🖼️',
        title: 'Upload Photos',
        description: 'Easily upload your photos with drag-and-drop support.'
      },
      {
        icon: '🏷️',
        title: 'Tag & Organize',
        description: 'Add tags to your photos and browse by category.'
      },
      {
        icon: '🔍',
        title: 'Search & Filter',
        description: 'Quickly find photos using powerful search and filtering.'
      },
      {
        icon: '📊',
        title: 'EXIF Data',
        description: 'Automatically extract and display photo metadata.'
      }
    ]
  });
});

// GET /health - Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

module.exports = router;