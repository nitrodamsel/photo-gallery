'use strict';

const express = require('express');
const router = express.Router();
const { Image, Tag, ImageTag, ApiKey, sequelize } = require('../models');
const cacheService = require('../services/cacheService');
const { fn, col, literal, Op } = require('sequelize');

/**
 * Simple basic-auth middleware for admin routes.
 * Uses ADMIN_USER / ADMIN_PASS env vars (defaults: admin/admin).
 */
function adminAuth(req, res, next) {
  const adminUser = process.env.ADMIN_USER || 'admin';
  const adminPass = process.env.ADMIN_PASS || 'admin';

  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Basic ')) {
    const base64 = authHeader.slice(6);
    const decoded = Buffer.from(base64, 'base64').toString('utf-8');
    const [user, pass] = decoded.split(':');
    if (user === adminUser && pass === adminPass) {
      return next();
    }
  }

  res.set('WWW-Authenticate', 'Basic realm="Admin Area"');
  res.status(401).send('Authentication required');
}

// Apply admin auth to all routes in this router
router.use(adminAuth);

/**
 * GET /admin
 * Render the admin dashboard view
 */
router.get('/', async (req, res, next) => {
  try {
    const stats = await getAggregateStats();
    res.render('admin/dashboard', {
      title: 'Admin Dashboard',
      stats,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /admin/stats
 * JSON endpoint returning aggregate statistics
 */
router.get('/stats', async (req, res, next) => {
  try {
    const stats = await getAggregateStats();
    res.json({ data: stats });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /admin/cache/flush
 * Flush all caches
 */
router.post('/cache/flush', async (req, res, next) => {
  try {
    if (cacheService && typeof cacheService.flush === 'function') {
      await cacheService.flush();
    }
    res.json({ success: true, message: 'Cache flushed successfully' });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /admin/jobs
 * Placeholder for Phase 10 background jobs
 */
router.get('/jobs', (req, res) => {
  res.json({
    data: {
      jobs: [],
      message: 'Background jobs will be available in a future phase',
    },
  });
});

/**
 * Aggregate stats helper
 */
async function getAggregateStats() {
  // Total image count and storage
  const imageStats = await Image.findOne({
    attributes: [
      [fn('COUNT', col('id')), 'totalImages'],
      [fn('COALESCE', fn('SUM', col('fileSize')), 0), 'totalStorageBytes'],
    ],
    raw: true,
  });

  // Total tag count
  const tagCount = await Tag.count();

  // Total API key count
  const apiKeyCount = await ApiKey.count();

  // Images per month (last 12 months)
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  let uploadsPerMonth = [];
  try {
    uploadsPerMonth = await Image.findAll({
      attributes: [
        [fn('DATE_TRUNC', 'month', col('createdAt')), 'month'],
        [fn('COUNT', col('id')), 'count'],
      ],
      where: {
        createdAt: { [Op.gte]: twelveMonthsAgo },
      },
      group: [fn('DATE_TRUNC', 'month', col('createdAt'))],
      order: [[fn('DATE_TRUNC', 'month', col('createdAt')), 'ASC']],
      raw: true,
    });
  } catch (err) {
    // SQLite fallback
    try {
      uploadsPerMonth = await Image.findAll({
        attributes: [
          [fn('strftime', '%Y-%m', col('createdAt')), 'month'],
          [fn('COUNT', col('id')), 'count'],
        ],
        where: {
          createdAt: { [Op.gte]: twelveMonthsAgo },
        },
        group: [fn('strftime', '%Y-%m', col('createdAt'))],
        order: [[fn('strftime', '%Y-%m', col('createdAt')), 'ASC']],
        raw: true,
      });
    } catch (e) {
      uploadsPerMonth = [];
    }
  }

  // Top 10 tags by image count
  let topTags = [];
  try {
    topTags = await Tag.findAll({
      attributes: [
        'id',
        'name',
        [fn('COUNT', col('images.id')), 'imageCount'],
      ],
      include: [
        {
          model: Image,
          as: 'images',
          through: { attributes: [] },
          attributes: [],
        },
      ],
      group: ['Tag.id'],
      order: [[literal('"imageCount"'), 'DESC']],
      limit: 10,
      subQuery: false,
      raw: true,
    });
  } catch (err) {
    topTags = [];
  }

  // Camera make distribution (from EXIF data if available)
  let cameraMakes = [];
  try {
    cameraMakes = await Image.findAll({
      attributes: [
        ['cameraMake', 'make'],
        [fn('COUNT', col('id')), 'count'],
      ],
      where: {
        cameraMake: { [Op.ne]: null },
      },
      group: ['cameraMake'],
      order: [[literal('count'), 'DESC']],
      limit: 10,
      raw: true,
    });
  } catch (err) {
    cameraMakes = [];
  }

  // Recent uploads
  const recentUploads = await Image.findAll({
    attributes: ['id', 'filename', 'title', 'originalName', 'fileSize', 'mimeType', 'createdAt'],
    order: [['createdAt', 'DESC']],
    limit: 10,
    raw: true,
  });

  return {
    totalImages: parseInt(imageStats?.totalImages) || 0,
    totalStorageBytes: parseInt(imageStats?.totalStorageBytes) || 0,
    totalStorageMB: ((parseInt(imageStats?.totalStorageBytes) || 0) / (1024 * 1024)).toFixed(2),
    tagCount,
    apiKeyCount,
    uploadsPerMonth,
    topTags,
    cameraMakes,
    recentUploads,
  };
}

module.exports = router;