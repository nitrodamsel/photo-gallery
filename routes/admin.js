'use strict';

const express = require('express');
const router = express.Router();
const { Image, Tag, ApiKey } = require('../models');
const { Op, fn, col, literal } = require('sequelize');
const cacheService = require('../services/cacheService');
const sequelize = require('../config/database');

/**
 * Simple basic-auth middleware for admin routes.
 * Uses ADMIN_USER and ADMIN_PASS environment variables.
 */
function basicAuth(req, res, next) {
  // Skip if no credentials configured (dev mode)
  const adminUser = process.env.ADMIN_USER;
  const adminPass = process.env.ADMIN_PASS;

  if (!adminUser || !adminPass) {
    return next();
  }

  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Admin Area"');
    return res.status(401).send('Authentication required');
  }

  const base64 = authHeader.slice(6);
  const decoded = Buffer.from(base64, 'base64').toString('utf8');
  const [user, pass] = decoded.split(':');

  if (user !== adminUser || pass !== adminPass) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Admin Area"');
    return res.status(401).send('Invalid credentials');
  }

  next();
}

router.use(basicAuth);

/**
 * GET /admin
 * Admin dashboard page
 */
router.get('/', async (req, res, next) => {
  try {
    const stats = await getStats();
    const recentImages = await Image.findAll({
      order: [['createdAt', 'DESC']],
      limit: 10,
      include: [{ model: Tag, as: 'tags', through: { attributes: [] } }],
    });

    res.render('admin/dashboard', {
      title: 'Admin Dashboard',
      stats,
      recentImages,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /admin/stats
 * JSON stats endpoint
 */
router.get('/stats', async (req, res, next) => {
  try {
    const stats = await getStats();
    res.json({ data: stats });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /admin/cache/flush
 * Flush the thumbnail/query cache
 */
router.post('/cache/flush', async (req, res, next) => {
  try {
    await cacheService.flush();
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
      message: 'Background job queue — coming in Phase 10',
    },
  });
});

/**
 * Aggregate statistics helper
 */
async function getStats() {
  const db = sequelize;

  // Total images
  const totalImages = await Image.count();

  // Total storage bytes
  const storageSumResult = await Image.findOne({
    attributes: [[fn('SUM', col('file_size')), 'total']],
    raw: true,
  });
  const totalStorageBytes = parseInt(storageSumResult?.total || 0);

  // Total tags
  const totalTags = await Tag.count();

  // Total API keys
  const totalApiKeys = await ApiKey.count();

  // Images per month (last 12 months)
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  let uploadsPerMonth = [];
  try {
    const monthlyData = await Image.findAll({
      attributes: [
        [fn('strftime', '%Y-%m', col('created_at')), 'month'],
        [fn('COUNT', col('id')), 'count'],
      ],
      where: { createdAt: { [Op.gte]: twelveMonthsAgo } },
      group: [literal("strftime('%Y-%m', created_at)")],
      order: [[literal("strftime('%Y-%m', created_at)"), 'ASC']],
      raw: true,
    });
    uploadsPerMonth = monthlyData;
  } catch (err) {
    // Fallback for PostgreSQL
    try {
      const monthlyData = await Image.findAll({
        attributes: [
          [fn('to_char', col('created_at'), 'YYYY-MM'), 'month'],
          [fn('COUNT', col('id')), 'count'],
        ],
        where: { createdAt: { [Op.gte]: twelveMonthsAgo } },
        group: [literal("to_char(created_at, 'YYYY-MM')")],
        order: [[literal("to_char(created_at, 'YYYY-MM')"), 'ASC']],
        raw: true,
      });
      uploadsPerMonth = monthlyData;
    } catch (err2) {
      console.warn('Could not fetch monthly stats:', err2.message);
    }
  }

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
    subQuery: false,
  });

  // Camera make distribution
  const cameraMakes = await Image.findAll({
    attributes: [
      'cameraMake',
      [fn('COUNT', col('id')), 'count'],
    ],
    where: { cameraMake: { [Op.not]: null } },
    group: ['cameraMake'],
    order: [[literal('count'), 'DESC']],
    limit: 10,
    raw: true,
  });

  return {
    totalImages,
    totalStorageBytes,
    totalStorageMB: (totalStorageBytes / (1024 * 1024)).toFixed(2),
    totalTags,
    totalApiKeys,
    uploadsPerMonth,
    topTags: topTags.map((t) => ({
      id: t.id,
      name: t.name,
      imageCount: parseInt(t.get('imageCount') || 0),
    })),
    cameraMakes: cameraMakes.filter((c) => c.cameraMake),
  };
}

module.exports = router;