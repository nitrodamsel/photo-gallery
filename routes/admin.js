'use strict';

const express = require('express');
const router = express.Router();
const { Image, Tag, ImageTag, ApiKey, sequelize } = require('../models');
const cacheService = require('../services/cacheService');
const { Op } = require('sequelize');

// Simple basic-auth middleware for admin routes
function adminAuth(req, res, next) {
  const adminUser = process.env.ADMIN_USER || 'admin';
  const adminPass = process.env.ADMIN_PASS || 'admin';

  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    res.set('WWW-Authenticate', 'Basic realm="Admin Area"');
    return res.status(401).render('error', {
      title: 'Unauthorized',
      message: 'Admin access required',
      error: { status: 401 },
    });
  }

  const credentials = Buffer.from(authHeader.slice(6), 'base64').toString('utf8');
  const [user, pass] = credentials.split(':');

  if (user === adminUser && pass === adminPass) {
    return next();
  }

  res.set('WWW-Authenticate', 'Basic realm="Admin Area"');
  return res.status(401).render('error', {
    title: 'Unauthorized',
    message: 'Invalid credentials',
    error: { status: 401 },
  });
}

// Helper to gather aggregate stats
async function gatherStats() {
  const totalImages = await Image.count();
  const totalTags = await Tag.count();
  const totalApiKeys = await ApiKey.count();

  // Total storage in bytes
  const storageResult = await Image.findOne({
    attributes: [[sequelize.fn('SUM', sequelize.col('fileSize')), 'totalBytes']],
    raw: true,
  });
  const totalStorageBytes = parseInt(storageResult?.totalBytes || 0);

  // Images per month (last 12 months)
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  const uploadsPerMonth = await Image.findAll({
    attributes: [
      [sequelize.fn('strftime', '%Y-%m', sequelize.col('createdAt')), 'month'],
      [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
    ],
    where: { createdAt: { [Op.gte]: twelveMonthsAgo } },
    group: [sequelize.fn('strftime', '%Y-%m', sequelize.col('createdAt'))],
    order: [[sequelize.fn('strftime', '%Y-%m', sequelize.col('createdAt')), 'ASC']],
    raw: true,
  });

  // Top 10 tags
  const topTags = await Tag.findAll({
    attributes: [
      'id',
      'name',
      'slug',
      [sequelize.fn('COUNT', sequelize.col('ImageTags.imageId')), 'imageCount'],
    ],
    include: [{ model: ImageTag, attributes: [], required: false }],
    group: ['Tag.id'],
    order: [[sequelize.literal('imageCount'), 'DESC']],
    limit: 10,
    subQuery: false,
  });

  // Camera make distribution
  const cameraMakes = await Image.findAll({
    attributes: [
      'cameraMake',
      [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
    ],
    where: { cameraMake: { [Op.ne]: null } },
    group: ['cameraMake'],
    order: [[sequelize.literal('count'), 'DESC']],
    limit: 10,
    raw: true,
  });

  // Recent uploads
  const recentUploads = await Image.findAll({
    attributes: ['id', 'originalName', 'fileSize', 'mimeType', 'createdAt'],
    order: [['createdAt', 'DESC']],
    limit: 10,
  });

  return {
    totalImages,
    totalTags,
    totalApiKeys,
    totalStorageBytes,
    uploadsPerMonth,
    topTags,
    cameraMakes,
    recentUploads,
  };
}

// GET /admin — render dashboard
router.get('/', adminAuth, async (req, res, next) => {
  try {
    const stats = await gatherStats();

    // Format storage
    const formatBytes = (bytes) => {
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
      if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    };

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
    const stats = await gatherStats();
    res.json({ data: stats });
  } catch (err) {
    next(err);
  }
});

// POST /admin/cache/flush — flush cache
router.post('/cache/flush', adminAuth, async (req, res, next) => {
  try {
    await cacheService.flush();
    res.json({ success: true, message: 'Cache flushed successfully' });
  } catch (err) {
    next(err);
  }
});

// GET /admin/jobs — placeholder for Phase 10 background jobs
router.get('/jobs', adminAuth, (req, res) => {
  res.json({
    data: {
      jobs: [],
      message: 'Background job support coming in Phase 10',
    },
  });
});

module.exports = router;