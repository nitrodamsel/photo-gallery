const express = require('express');
const router = express.Router();
const searchService = require('../services/searchService');
const { buildSearchOptions, serializeSearchOptions, buildActiveFilterSummary, countActiveFilters } = require('../utils/queryBuilder');

/**
 * GET /search
 * Full search page with filters, renders views/search.ejs
 */
router.get('/', async (req, res, next) => {
  try {
    const searchOptions = buildSearchOptions(req.query);
    const [results, facets] = await Promise.all([
      searchService.search(searchOptions),
      searchService.getFacets(),
    ]);

    const activeFilters = buildActiveFilterSummary(searchOptions, facets);
    const activeFilterCount = countActiveFilters(searchOptions);

    // Build pagination query strings
    const paginationBase = serializeSearchOptions(searchOptions, { page: undefined });

    res.render('search', {
      title: searchOptions.q ? `Search: "${searchOptions.q}"` : 'Search Images',
      searchOptions,
      results: results.rows,
      count: results.count,
      totalPages: results.totalPages,
      currentPage: results.page,
      facets,
      activeFilters,
      activeFilterCount,
      paginationBase,
      query: req.query,
      serializeSearchOptions,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/search
 * JSON endpoint for client-side search
 */
router.get('/api/search', async (req, res, next) => {
  try {
    const searchOptions = buildSearchOptions(req.query);
    const results = await searchService.search(searchOptions);

    res.json({
      results: results.rows.map((img) => ({
        id: img.id,
        filename: img.filename,
        originalName: img.originalName,
        description: img.description,
        thumbnailPath: img.thumbnailPath,
        width: img.width,
        height: img.height,
        fileSize: img.fileSize,
        mimeType: img.mimeType,
        createdAt: img.createdAt,
        tags: img.tags || [],
        latitude: img.latitude,
        longitude: img.longitude,
      })),
      pagination: {
        page: results.page,
        limit: results.limit,
        count: results.count,
        totalPages: results.totalPages,
        hasNextPage: results.page < results.totalPages,
        hasPrevPage: results.page > 1,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/search/facets
 * Returns distinct camera makes and tag list for filter panel population
 */
router.get('/api/search/facets', async (req, res, next) => {
  try {
    const facets = await searchService.getFacets();
    res.json(facets);
  } catch (err) {
    next(err);
  }
});

module.exports = router;