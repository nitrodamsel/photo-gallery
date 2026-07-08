'use strict';

const express = require('express');
const router = express.Router();
const { Image, Tag, ApiKey, sequelize } = require('../models');
const cacheService = require('../services/cacheService');
const { fn, col, literal, Op } = require('sequelize');

/**
 * Simple basic-auth middleware for admin routes.
 * Uses ADMIN_USER and ADMIN_PASS environment variables.
 * Falls back to admin/admin in development.
 */
function basicAuth(req, res, next) {
  const adminUser = process.env.ADMIN_USER || 'admin';
  const adminPass = process.env.ADMIN_PASS || 'admin';

  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Basic ')) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Admin Area"');
    return res.status(401).send('Authentication required');
  }

  const base64 = authHeader.slice(6);
  const decoded = Buffer.from(base64, 'base64').toString('utf8');
  const [user, ...passParts] = decoded.split(':');
  const pass = passParts.join(':');

  if (user === adminUser && pass === adminPass) {
    return next();
  }

  res.setHeader('WWW-Authenticate', 'Basic realm="Admin Area"');
  return res.status(401).send('Invalid credentials');
}

// Apply basic auth to all admin routes
router.use(basicAuth);

/**
 * GET /admin
 * Render the admin dashboard
 */
router.get('/', async (req, res, next) => {
  try {
    const [
      totalImages,
      totalStorage,
      totalTags,
      totalApiKeys,
      topTags,
      cameraMakeStats,
      recentImages,
      uploadsPerMonth,
    ] = await Promise.all([
      // Total images
      Image.count(),

      // Total storage bytes
      Image.sum('fileSize'),

      // Total tags
      Tag.count(),

      // Total API keys
      ApiKey.count(),

      // Top 10 tags by image count
      Tag.findAll({
        attributes: [
          'id',
          'name',
          [
            literal('(SELECT COUNT(*) FROM image_tags WHERE image_tags."tagId" = "Tag"."id")'),
            'imageCount',
          ],
        ],
        order: [[literal('"imageCount"'), 'DESC']],
        limit: 10,
        raw: true,
      }),

      // Camera make distribution
      Image.findAll({
        attributes: [
          'cameraMake',
          [fn('COUNT', col('id')), 'count'],
        ],
        where: { cameraMake: { [Op.ne]: null } },
        group: ['cameraMake'],
        order: [[fn('COUNT', col('id')), 'DESC']],
        limit: 10,
        raw: true,
      }),

      // Recent 10 uploads
      Image.findAll({
        order: [['createdAt', 'DESC']],
        limit: 10,
        attributes: ['id', 'originalName', 'fileSize', 'createdAt', 'mimeType'],
      }),

      // Uploads per month (last 12 months)
      Image.findAll({
        attributes: [
          [fn('DATE_TRUNC', 'month', col('createdAt')), 'month'],
          [fn('COUNT', col('id')), 'count'],
        ],
        where: {
          createdAt: {
            [Op.gte]: new Date(new Date().setFullYear(new Date().getFullYear() - 1)),
          },
        },
        group: [fn('DATE_TRUNC', 'month', col('createdAt'))],
        order: [[fn('DATE_TRUNC', 'month', col('createdAt')), 'ASC']],
        raw: true,
      }),
    ]);

    res.render('admin/dashboard', {
      title: 'Admin Dashboard',
      stats: {
        totalImages: totalImages || 0,
        totalStorage: totalStorage || 0,
        totalTags: totalTags || 0,
        totalApiKeys: totalApiKeys || 0,
      },
      topTags,
      cameraMakeStats,
      recentImages,
      uploadsPerMonth: uploadsPerMonth.map((row) => ({
        month: new Date(row.month).toLocaleDateString('en-US', { year: 'numeric', month: 'short' }),
        count: parseInt(row.count),
      })),
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
    const [
      totalImages,
      totalStorage,
      totalTags,
      totalApiKeys,
      topTags,
      cameraMakeStats,
      uploadsPerMonth,
    ] = await Promise.all([
      Image.count(),
      Image.sum('fileSize'),
      Tag.count(),
      ApiKey.count(),

      Tag.findAll({
        attributes: [
          'id',
          'name',
          [
            literal('(SELECT COUNT(*) FROM image_tags WHERE image_tags."tagId" = "Tag"."id")'),
            'imageCount',
          ],
        ],
        order: [[literal('"imageCount"'), 'DESC']],
        limit: 10,
        raw: true,
      }),

      Image.findAll({
        attributes: [
          'cameraMake',
          [fn('COUNT', col('id')), 'count'],
        ],
        where: { cameraMake: { [Op.ne]: null } },
        group: ['cameraMake'],
        order: [[fn('COUNT', col('id')), 'DESC']],
        limit: 10,
        raw: true,
      }),

      Image.findAll({
        attributes: [
          [fn('DATE_TRUNC', 'month', col('createdAt')), 'month'],
          [fn('COUNT', col('id')), 'count'],
        ],
        where: {
          createdAt: {
            [Op.gte]: new Date(new Date().setFullYear(new Date().getFullYear() - 1)),
          },
        },
        group: [fn('DATE_TRUNC', 'month', col('createdAt'))],
        order: [[fn('DATE_TRUNC', 'month', col('createdAt')), 'ASC']],
        raw: true,
      }),
    ]);

    res.json({
      data: {
        totals: {
          images: totalImages || 0,
          storageBytes: totalStorage || 0,
          storageMB: Math.round(((totalStorage || 0) / (1024 * 1024)) * 100) / 100,
          tags: totalTags || 0,
          apiKeys: totalApiKeys || 0,
        },
        topTags: topTags.map((t) => ({ id: t.id, name: t.name, count: parseInt(t.imageCount) })),
        cameraMakes: cameraMakeStats.map((c) => ({ make: c.cameraMake, count: parseInt(c.count) })),
        uploadsPerMonth: uploadsPerMonth.map((row) => ({
          month: new Date(row.month).toISOString().substring(0, 7),
          count: parseInt(row.count),
        })),
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /admin/cache/flush
 * Flush the thumbnail/response cache
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
      message: 'Background job queue will be implemented in Phase 10',
    },
  });
});

/**
 * GET /admin/api-keys
 * List all API keys (without the actual key value)
 */
router.get('/api-keys', async (req, res, next) => {
  try {
    const keys = await ApiKey.findAll({
      attributes: ['id', 'label', 'lastUsedAt', 'createdAt'],
      order: [['createdAt', 'DESC']],
    });
    res.json({ data: keys });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /admin/api-keys/:id
 * Revoke an API key
 */
router.delete('/api-keys/:id', async (req, res, next) => {
  try {
    const key = await ApiKey.findByPk(req.params.id);
    if (!key) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'API key not found' } });
    }
    await key.destroy();
    res.json({ success: true, message: 'API key revoked' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;