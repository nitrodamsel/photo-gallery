'use strict';

const express = require('express');
const router = express.Router();
const { Image, Tag, ApiKey, sequelize } = require('../models');
const { fn, col, literal } = require('sequelize');
const cacheService = require('../services/cacheService');

// Simple basic-auth middleware for admin routes
function adminAuth(req, res, next) {
  const adminUser = process.env.ADMIN_USER || 'admin';
  const adminPass = process.env.ADMIN_PASS || 'admin';

  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    res.set('WWW-Authenticate', 'Basic realm="Admin Area"');
    return res.status(401).send('Authentication required.');
  }

  const base64Credentials = authHeader.slice(6);
  const credentials = Buffer.from(base64Credentials, 'base64').toString('utf8');
  const [user, pass] = credentials.split(':');

  if (user === adminUser && pass === adminPass) {
    return next();
  }

  res.set('WWW-Authenticate', 'Basic realm="Admin Area"');
  return res.status(401).send('Invalid credentials.');
}

// Helper: get aggregate stats
async function getStats() {
  // Total images
  const totalImages = await Image.count();

  // Total storage (sum of fileSize)
  const storageResult = await Image.findOne({
    attributes: [[fn('SUM', col('fileSize')), 'totalBytes']],
    raw: true,
  });
  const totalStorageBytes = parseInt(storageResult?.totalBytes || 0, 10);

  // Total tags
  const totalTags = await Tag.count();

  // Total API keys
  const totalApiKeys = await ApiKey.count();

  // Images per month (last 12 months)
  const imagesPerMonth = await Image.findAll({
    attributes: [
      [fn('strftime', '%Y-%m', col('createdAt')), 'month'],
      [fn('COUNT', col('id')), 'count'],
    ],
    group: [literal("strftime('%Y-%m', createdAt)")],
    order: [[literal("strftime('%Y-%m', createdAt)"), 'ASC']],
    limit: 12,
    raw: true,
  });

  // Top 10 tags by image count
  const topTags = await Tag.findAll({
    attributes: [
      'id',
      'name',
      [fn('COUNT', col('images.id')), 'imageCount'],
    ],
    include: [
      {
        model: Image,
        as: 'images',
        attributes: [],
        through: { attributes: [] },
      },
    ],
    group: ['Tag.id'],
    order: [[literal('imageCount'), 'DESC']],
    limit: 10,
  });

  // Camera make distribution
  let cameraMakes = [];
  try {
    cameraMakes = await Image.findAll({
      attributes: [
        ['exifCameraMake', 'make'],
        [fn('COUNT', col('id')), 'count'],
      ],
      where: {
        exifCameraMake: { [require('sequelize').Op.not]: null },
      },
      group: ['exifCameraMake'],
      order: [[literal('count'), 'DESC']],
      limit: 10,
      raw: true,
    });
  } catch (e) {
    // exifCameraMake column may not exist yet
    cameraMakes = [];
  }

  // Recent uploads
  const recentUploads = await Image.findAll({
    order: [['createdAt', 'DESC']],
    limit: 5,
    include: [{ model: Tag, as: 'tags', through: { attributes: [] } }],
  });

  return {
    totalImages,
    totalStorageBytes,
    totalTags,
    totalApiKeys,
    imagesPerMonth,
    topTags,
    cameraMakes,
    recentUploads,
  };
}

// GET /admin — render admin dashboard
router.get('/', adminAuth, async (req, res, next) => {
  try {
    const stats = await getStats();
    res.render('admin/dashboard', {
      title: 'Admin Dashboard',
      stats,
      formatBytes,
    });
  } catch (err) {
    next(err);
  }
});

// GET /admin/stats — JSON stats endpoint
router.get('/stats', adminAuth, async (req, res, next) => {
  try {
    const stats = await getStats();
    res.json({ data: stats });
  } catch (err) {
    next(err);
  }
});

// POST /admin/cache/flush — flush the cache
router.post('/cache/flush', adminAuth, async (req, res, next) => {
  try {
    await cacheService.flush();
    res.json({ success: true, message: 'Cache flushed successfully.' });
  } catch (err) {
    next(err);
  }
});

// GET /admin/jobs — placeholder for Phase 10 background jobs
router.get('/jobs', adminAuth, (req, res) => {
  res.json({
    data: {
      jobs: [],
      message: 'Background job queue coming in Phase 10.',
    },
  });
});

// Helper: format bytes to human readable
function formatBytes(bytes, decimals = 2) {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

module.exports = router;