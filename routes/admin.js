'use strict';

const express = require('express');
const router = express.Router();
const { Image, Tag, ApiKey, sequelize } = require('../models');
const { Op, fn, col, literal } = require('sequelize');
const cacheService = require('../services/cacheService');

/**
 * Simple basic-auth middleware for admin routes.
 * Uses ADMIN_USER / ADMIN_PASS env vars (default: admin / admin).
 */
function basicAuth(req, res, next) {
  // Allow if no password is set in production? For dev, skip if env vars not set
  const adminUser = process.env.ADMIN_USER || 'admin';
  const adminPass = process.env.ADMIN_PASS || 'admin';

  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    res.set('WWW-Authenticate', 'Basic realm="Admin Area"');
    return res.status(401).send('Authentication required');
  }

  const base64 = authHeader.slice(6);
  const decoded = Buffer.from(base64, 'base64').toString('utf-8');
  const [user, ...passParts] = decoded.split(':');
  const pass = passParts.join(':');

  if (user !== adminUser || pass !== adminPass) {
    res.set('WWW-Authenticate', 'Basic realm="Admin Area"');
    return res.status(401).send('Invalid credentials');
  }

  return next();
}

// Apply basic auth to all admin routes
router.use(basicAuth);

/**
 * GET /admin
 * Render the admin dashboard
 */
router.get('/', async (req, res, next) => {
  try {
    const stats = await getStats();
    return res.render('admin/dashboard', {
      title: 'Admin Dashboard',
      stats,
      path: '/admin',
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /admin/stats
 * JSON endpoint returning aggregate statistics
 */
router.get('/stats', async (req, res, next) => {
  try {
    const stats = await getStats();
    return res.json({ data: stats });
  } catch (err) {
    return next(err);
  }
});

/**
 * POST /admin/cache/flush
 * Flush the thumbnail/application cache
 */
router.post('/cache/flush', async (req, res, next) => {
  try {
    await cacheService.flush();
    return res.json({ success: true, message: 'Cache flushed successfully' });
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /admin/jobs
 * Placeholder for background jobs (Phase 10)
 */
router.get('/jobs', (req, res) => {
  return res.json({
    data: {
      jobs: [],
      message: 'Background job queue — coming in Phase 10',
    },
  });
});

/**
 * Helper: gather all aggregate stats
 */
async function getStats() {
  // Total images
  const totalImages = await Image.count();

  // Total storage (sum of fileSize)
  const storagResult = await Image.findOne({
    attributes: [[fn('SUM', col('fileSize')), 'totalStorage']],
    raw: true,
  });
  const totalStorage = parseInt(storagResult?.totalStorage || 0);

  // Total tags
  const totalTags = await Tag.count();

  // Total API keys
  const totalApiKeys = await ApiKey.count();

  // Images per month (last 12 months)
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  let uploadsPerMonth = [];
  try {
    const dialect = sequelize.getDialect();
    let dateFormat;
    if (dialect === 'postgres') {
      dateFormat = literal("TO_CHAR(\"createdAt\", 'YYYY-MM')");
    } else if (dialect === 'sqlite') {
      dateFormat = fn('strftime', '%Y-%m', col('createdAt'));
    } else {
      dateFormat = fn('DATE_FORMAT', col('createdAt'), '%Y-%m');
    }

    const monthlyData = await Image.findAll({
      attributes: [
        [dateFormat, 'month'],
        [fn('COUNT', col('id')), 'count'],
      ],
      where: { createdAt: { [Op.gte]: twelveMonthsAgo } },
      group: [dateFormat],
      order: [[dateFormat, 'ASC']],
      raw: true,
    });

    uploadsPerMonth = monthlyData.map((row) => ({
      month: row.month,
      count: parseInt(row.count || 0),
    }));
  } catch (err) {
    console.error('Error getting monthly upload stats:', err.message);
    uploadsPerMonth = [];
  }

  // Top 10 tags
  let topTags = [];
  try {
    topTags = await Tag.findAll({
      include: [
        {
          model: Image,
          as: 'images',
          attributes: [],
          through: { attributes: [] },
        },
      ],
      attributes: [
        'id',
        'name',
        [fn('COUNT', col('images.id')), 'imageCount'],
      ],
      group: ['Tag.id'],
      order: [[literal('imageCount'), 'DESC']],
      limit: 10,
      subQuery: false,
    });
    topTags = topTags.map((t) => ({
      id: t.id,
      name: t.name,
      imageCount: parseInt(t.dataValues.imageCount || 0),
    }));
  } catch (err) {
    console.error('Error getting top tags:', err.message);
    topTags = [];
  }

  // Camera make distribution
  let cameraMakes = [];
  try {
    cameraMakes = await Image.findAll({
      attributes: [
        'cameraMake',
        [fn('COUNT', col('id')), 'count'],
      ],
      where: {
        cameraMake: { [Op.ne]: null, [Op.ne]: '' },
      },
      group: ['cameraMake'],
      order: [[literal('count'), 'DESC']],
      limit: 10,
      raw: true,
    });
    cameraMakes = cameraMakes.map((c) => ({
      make: c.cameraMake,
      count: parseInt(c.count || 0),
    }));
  } catch (err) {
    console.error('Error getting camera makes:', err.message);
    cameraMakes = [];
  }

  // Recent uploads
  let recentUploads = [];
  try {
    recentUploads = await Image.findAll({
      order: [['createdAt', 'DESC']],
      limit: 10,
      attributes: ['id', 'originalName', 'title', 'fileSize', 'mimeType', 'createdAt', 'filename'],
    });
  } catch (err) {
    console.error('Error getting recent uploads:', err.message);
  }

  return {
    totalImages,
    totalStorage,
    totalStorageFormatted: formatBytes(totalStorage),
    totalTags,
    totalApiKeys,
    uploadsPerMonth,
    topTags,
    cameraMakes,
    recentUploads,
  };
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

module.exports = router;