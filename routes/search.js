'use strict';

const express = require('express');
const router  = express.Router();

const searchService               = require('../services/searchService');
const { buildSearchOptions,
        searchOptionsToQuery,
        buildFilterSummary }      = require('../utils/queryBuilder');
const { Tag }                     = require('../models');

// ── GET /search ───────────────────────────────────────────────────────────────
// Full-page search results (SSR)
router.get('/', async (req, res, next) => {
  try {
    const opts       = buildSearchOptions(req.query);
    const { rows: images, count, totalPages, page, limit } =
      await searchService.search(opts);

    const cameraMakes    = await searchService.getDistinctCameraMakes();
    const allTags        = await Tag.findAll({ order: [['name', 'ASC']] });
    const filterSummary  = buildFilterSummary(opts);
    const queryForLinks  = searchOptionsToQuery(opts);

    res.render('search', {
      title:        'Search',
      images,
      count,
      totalPages,
      page,
      limit,
      opts,
      filterSummary,
      queryForLinks,
      cameraMakes,
      allTags,
      // helpers for pagination links
      buildPageQuery: (p) => new URLSearchParams({ ...queryForLinks, page: p }).toString(),
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/search ───────────────────────────────────────────────────────────
// JSON endpoint for client-side / AJAX usage
router.get('/api/search', async (req, res, next) => {
  try {
    const opts = buildSearchOptions(req.query);
    const { rows: images, count, totalPages, page, limit } =
      await searchService.search(opts);

    const serialised = images.map(serializeImage);

    res.json({
      results:    serialised,
      pagination: { page, limit, count, totalPages },
      filters:    opts,
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/search/facets ────────────────────────────────────────────────────
// Returns facet data (camera makes + tags) for populating filter panels
router.get('/api/search/facets', async (req, res, next) => {
  try {
    const [cameraMakes, tags] = await Promise.all([
      searchService.getDistinctCameraMakes(),
      Tag.findAll({
        order: [['name', 'ASC']],
        attributes: ['id', 'name', 'slug'],
      }),
    ]);

    res.json({
      cameraMakes,
      tags: tags.map((t) => ({ id: t.id, name: t.name, slug: t.slug })),
    });
  } catch (err) {
    next(err);
  }
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function serializeImage(img) {
  return {
    id:           img.id,
    originalName: img.originalName,
    filename:     img.filename,
    description:  img.description,
    width:        img.width,
    height:       img.height,
    fileSize:     img.fileSize,
    mimeType:     img.mimeType,
    capturedAt:   img.capturedAt,
    createdAt:    img.createdAt,
    latitude:     img.latitude,
    longitude:    img.longitude,
    tags:         (img.tags || []).map((t) => ({ id: t.id, name: t.name, slug: t.slug })),
    url:          `/uploads/${img.filename}`,
    thumbnailUrl: `/uploads/thumbnails/${img.filename}`,
  };
}

module.exports = router;