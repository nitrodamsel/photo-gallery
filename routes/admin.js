'use strict';

const express = require('express');
const router = express.Router();
const { Image, Tag, ApiKey, ImageTag } = require('../models');
const { fn, col, literal, Op } = require('sequelize');
const cacheService = require('../services/cacheService');

// Simple basic-auth for admin routes (separate from API key auth)
function adminAuth(req, res, next) {
  const adminUser = process.env.ADMIN_USER || 'admin';
  const adminPass = process.env.ADMIN_PASS || 'admin';

  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Basic ')) {
    res.set('WWW-Authenticate', 'Basic realm="Admin Dashboard"');
    return res.status(401).render('error', {
      title: 'Authentication Required',
      message: 'Please provide admin credentials.',
      error: { status: 401 },
    });
  }

  const base64 = authHeader.slice(6);
  const [user, pass] = Buffer.from(base64, 'base64').toString().split(':');

  if (user !== adminUser || pass !== adminPass) {
    res.set('WWW-Authenticate', 'Basic realm="Admin Dashboard"');
    return res.status(401).render('error', {
      title: 'Authentication Failed',
      message: 'Invalid admin credentials.',
      error: { status: 401 },
    });
  }

  return next();
}

// Aggregate stats helper
async function getStats() {
  const { sequelize } = require('../models');

  // Total images
  const totalImages = await Image.count();

  // Total storage
  const storageResult = await Image.findOne({
    attributes: [[fn('SUM', col('fileSize')), 'totalBytes']],
    raw: true,
  });
  const totalStorageBytes = parseInt(storageResult?.totalBytes || 0);

  // Total tags
  const totalTags = await Tag.count();

  // Total API keys
  const totalApiKeys = await ApiKey.count();

  // Images per month (last 12 months)
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  let imagesPerMonth = [];
  try {
    const dialect = sequelize.getDialect();
    let dateFormat;

    if (dialect === 'sqlite') {
      dateFormat = "strftime('%Y-%m', createdAt)";
    } else if (dialect === 'mysql' || dialect === 'mariadb') {
      dateFormat = "DATE_FORMAT(createdAt, '%Y-%m')";
    } else if (dialect === 'postgres') {
      dateFormat = "TO_CHAR(\"createdAt\", 'YYYY-MM')";
    } else {
      dateFormat = "strftime('%Y-%m', createdAt)";
    }

    imagesPerMonth = await Image.findAll({
      attributes: [
        [literal(dateFormat), 'month'],
        [fn('COUNT', col('id')), 'count'],
      ],
      where: { createdAt: { [Op.gte]: twelveMonthsAgo } },
      group: [literal(dateFormat)],
      order: [[literal(dateFormat), 'ASC']],
      raw: true,
    });
  } catch (err) {
    console.error('Failed to get images per month:', err);
  }

  // Top 10 tags
  let topTags = [];
  try {
    topTags = await Tag.findAll({
      attributes: [
        'id',
        'name',
        'slug',
        [fn('COUNT', col('Images.id')), 'imageCount'],
      ],
      include: [
        {
          model: Image,
          through: { attributes: [] },
          attributes: [],
          required: false,
        },
      ],
      group: ['Tag.id'],
      order: [[fn('COUNT', col('Images.id')), 'DESC']],
      limit: 10,
    });
  } catch (err) {
    console.error('Failed to get top tags:', err);
  }

  // Camera make distribution
  let cameraMakes = [];
  try {
    cameraMakes = await Image.findAll({
      attributes: [
        'cameraMake',
        [fn('COUNT', col('id')), 'count'],
      ],
      where: { cameraMake: { [Op.ne]: null, [Op.ne]: '' } },
      group: ['cameraMake'],
      order: [[fn('COUNT', col('id')), 'DESC']],
      limit: 10,
      raw: true,
    });
  } catch (err) {
    console.error('Failed to get camera makes:', err);
  }

  // Recent uploads (last 10)
  let recentUploads = [];
  try {
    recentUploads = await Image.findAll({
      order: [['createdAt', 'DESC']],
      limit: 10,
      include: [
        {
          model: Tag,
          through: { attributes: [] },
          attributes: ['id', 'name', 'slug'],
        },
      ],
    });
  } catch (err) {
    console.error('Failed to get recent uploads:', err);
  }

  return {
    totalImages,
    totalStorageBytes,
    totalTags,
    totalApiKeys,
    imagesPerMonth: imagesPerMonth.map((r) => ({
      month: r.month,
      count: parseInt(r.count),
    })),
    topTags: topTags.map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      count: parseInt(t.getDataValue('imageCount') || 0),
    })),
    cameraMakes: cameraMakes.map((c) => ({
      make: c.cameraMake,
      count: parseInt(c.count),
    })),
    recentUploads,
  };
}

// GET /admin - Dashboard view
router.get('/', adminAuth, async (req, res) => {
  try {
    const stats = await getStats();
    return res.render('admin/dashboard', {
      title: 'Admin Dashboard',
      stats,
    });
  } catch (err) {
    console.error('Admin dashboard error:', err);
    return res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to load admin dashboard.',
      error: { status: 500, stack: process.env.NODE_ENV !== 'production' ? err.stack : '' },
    });
  }
});

// GET /admin/stats - JSON stats endpoint
router.get('/stats', adminAuth, async (req, res) => {
  try {
    const stats = await getStats();
    return res.json({ data: stats });
  } catch (err) {
    console.error('Admin stats error:', err);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch stats.' },
    });
  }
});

// POST /admin/cache/flush - Flush cache
router.post('/cache/flush', adminAuth, async (req, res) => {
  try {
    await cacheService.flush();
    return res.json({ data: { message: 'Cache flushed successfully.' } });
  } catch (err) {
    console.error('Cache flush error:', err);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to flush cache.' },
    });
  }
});

// GET /admin/jobs - Placeholder for Phase 10 background jobs
router.get('/jobs', adminAuth, async (req, res) => {
  try {
    return res.json({
      data: {
        message: 'Background jobs will be available in Phase 10.',
        jobs: [],
      },
    });
  } catch (err) {
    console.error('Admin jobs error:', err);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch jobs.' },
    });
  }
});

module.exports = router;