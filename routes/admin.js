'use strict';

const express = require('express');
const router = express.Router();
const { Image, Tag, ApiKey, sequelize } = require('../models');
const cacheService = require('../services/cacheService');
const { Op } = require('sequelize');

/**
 * Simple basic-auth middleware for admin routes
 */
function basicAuth(req, res, next) {
  const adminUser = process.env.ADMIN_USER || 'admin';
  const adminPass = process.env.ADMIN_PASS || 'admin';

  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    res.set('WWW-Authenticate', 'Basic realm="Admin Dashboard"');
    return res.status(401).send('Authentication required');
  }

  const base64 = authHeader.slice(6);
  const decoded = Buffer.from(base64, 'base64').toString('utf8');
  const colonIdx = decoded.indexOf(':');
  const user = decoded.slice(0, colonIdx);
  const pass = decoded.slice(colonIdx + 1);

  if (user === adminUser && pass === adminPass) {
    return next();
  }

  res.set('WWW-Authenticate', 'Basic realm="Admin Dashboard"');
  return res.status(401).send('Invalid credentials');
}

/**
 * Gather aggregate statistics
 */
async function gatherStats() {
  const [
    totalImages,
    storageResult,
    totalTags,
    totalApiKeys,
    uploadsPerMonth,
    topTags,
    cameraMakeDistribution,
    recentUploads,
  ] = await Promise.all([
    // Total images
    Image.count(),

    // Total storage (sum of fileSize)
    Image.findOne({
      attributes: [[sequelize.fn('SUM', sequelize.col('fileSize')), 'total']],
      raw: true,
    }),

    // Total tags
    Tag.count(),

    // Total API keys
    ApiKey.count(),

    // Images per month (last 12 months)
    Image.findAll({
      attributes: [
        [sequelize.fn('strftime', '%Y-%m', sequelize.col('createdAt')), 'month'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      ],
      where: {
        createdAt: {
          [Op.gte]: new Date(new Date().setFullYear(new Date().getFullYear() - 1)),
        },
      },
      group: [sequelize.fn('strftime', '%Y-%m', sequelize.col('createdAt'))],
      order: [[sequelize.fn('strftime', '%Y-%m', sequelize.col('createdAt')), 'ASC']],
      raw: true,
    }),

    // Top 10 tags by image count
    Tag.findAll({
      include: [{ model: Image, as: 'images', attributes: [], through: { attributes: [] } }],
      attributes: [
        'id',
        'name',
        'slug',
        [sequelize.fn('COUNT', sequelize.col('images.id')), 'imageCount'],
      ],
      group: ['Tag.id'],
      order: [[sequelize.literal('imageCount'), 'DESC']],
      limit: 10,
      subQuery: false,
      raw: true,
    }),

    // Camera make distribution
    Image.findAll({
      attributes: [
        'cameraMake',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      ],
      where: { cameraMake: { [Op.ne]: null } },
      group: ['cameraMake'],
      order: [[sequelize.literal('count'), 'DESC']],
      limit: 10,
      raw: true,
    }),

    // Recent uploads (last 5)
    Image.findAll({
      order: [['createdAt', 'DESC']],
      limit: 5,
      raw: true,
    }),
  ]);

  const totalStorageBytes = parseInt(storageResult?.total || 0);

  return {
    totalImages,
    totalStorageBytes,
    totalStorageMB: (totalStorageBytes / (1024 * 1024)).toFixed(2),
    totalStorageGB: (totalStorageBytes / (1024 * 1024 * 1024)).toFixed(3),
    totalTags,
    totalApiKeys,
    uploadsPerMonth: uploadsPerMonth.map(r => ({
      month: r.month,
      count: parseInt(r.count),
    })),
    topTags: topTags.map(r => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      imageCount: parseInt(r.imageCount),
    })),
    cameraMakeDistribution: cameraMakeDistribution.map(r => ({
      make: r.cameraMake || 'Unknown',
      count: parseInt(r.count),
    })),
    recentUploads,
  };
}

/**
 * GET /admin
 * Admin dashboard (HTML)
 */
router.get('/', basicAuth, async (req, res, next) => {
  try {
    const stats = await gatherStats();
    res.render('admin/dashboard', { stats, title: 'Admin Dashboard' });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /admin/stats
 * JSON stats endpoint
 */
router.get('/stats', basicAuth, async (req, res, next) => {
  try {
    const stats = await gatherStats();
    res.json({ data: stats });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /admin/cache/flush
 * Flush all caches
 */
router.post('/cache/flush', basicAuth, async (req, res, next) => {
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
router.get('/jobs', basicAuth, async (req, res, next) => {
  try {
    res.json({
      data: {
        jobs: [],
        message: 'Background job management coming in Phase 10',
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;