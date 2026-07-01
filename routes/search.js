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
      title: 'Search Images',
      results: rows,
      pagination: {
        total: count,
        totalPages,
        currentPage: searchOptions.page,
        limit: searchOptions.limit,
      },
      query: req.query,
      searchOptions,
      facets,
      activeFilters: buildActiveFilterSummary(req.query),
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
        total: count,
        totalPages,
        currentPage: searchOptions.page,
        limit: searchOptions.limit,
      },
      query: searchOptions,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/search/facets — returns distinct camera makes and tags
router.get('/api/search/facets', async (req, res, next) => {
  try {
    const facets = await searchService.getFacets();
    res.json(facets);
  } catch (err) {
    next(err);
  }
});

function buildActiveFilterSummary(query) {
  const filters = [];

  if (query.q) {
    filters.push({ label: 'Search', value: `"${query.q}"` });
  }
  if (query.dateFrom) {
    filters.push({ label: 'From', value: query.dateFrom });
  }
  if (query.dateTo) {
    filters.push({ label: 'To', value: query.dateTo });
  }
  if (query.cameraMake) {
    filters.push({ label: 'Camera', value: query.cameraMake });
  }
  if (query.hasGps === 'true' || query.hasGps === '1') {
    filters.push({ label: 'Has GPS', value: 'Yes' });
  }
  if (query.tags) {
    const tagList = Array.isArray(query.tags) ? query.tags : [query.tags];
    filters.push({ label: 'Tags', value: tagList.join(', ') });
  }

  return filters;
}

module.exports = router;