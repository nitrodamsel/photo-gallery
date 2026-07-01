const express = require('express');
const router = express.Router();
const searchService = require('../services/searchService');
const { buildSearchOptions } = require('../utils/queryBuilder');

// GET /search — renders search results page
router.get('/', async (req, res, next) => {
  try {
    const searchOptions = buildSearchOptions(req.query);
    const { rows, count, totalPages } = await searchService.search(searchOptions);

    // Get facets for filter panel
    const facets = await searchService.getFacets();

    res.render('search', {
      title: 'Search',
      results: rows,
      pagination: {
        currentPage: searchOptions.page,
        totalPages,
        totalCount: count,
        limit: searchOptions.limit,
      },
      query: req.query,
      searchOptions,
      facets,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/search — returns JSON results
router.get('/api/search', async (req, res, next) => {
  try {
    const searchOptions = buildSearchOptions(req.query);
    const { rows, count, totalPages } = await searchService.search(searchOptions);

    res.json({
      results: rows,
      pagination: {
        currentPage: searchOptions.page,
        totalPages,
        totalCount: count,
        limit: searchOptions.limit,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/search/facets — returns distinct cameraMake values and tag list
router.get('/api/search/facets', async (req, res, next) => {
  try {
    const facets = await searchService.getFacets();
    res.json(facets);
  } catch (err) {
    next(err);
  }
});

module.exports = router;