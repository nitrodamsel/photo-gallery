/**
 * Pure helper that converts flat query-string params into a structured search options object
 * with type coercion and sensible defaults.
 */

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 24;
const MAX_LIMIT = 100;
const VALID_SORT_OPTIONS = ['relevance', 'date_desc', 'date_asc', 'name'];

/**
 * Parse and validate a raw query-string params object into a structured search options object.
 *
 * @param {Object} params - Raw query string params (from req.query)
 * @returns {Object} Structured search options
 */
function buildSearchOptions(params = {}) {
  const options = {};

  // Search query string
  options.q = typeof params.q === 'string' ? params.q.trim().slice(0, 500) : '';

  // Tag IDs — can be array or single value
  if (Array.isArray(params.tags)) {
    options.tags = params.tags.map(Number).filter((n) => !isNaN(n) && n > 0);
  } else if (params.tags != null && params.tags !== '') {
    const parsed = Number(params.tags);
    options.tags = !isNaN(parsed) && parsed > 0 ? [parsed] : [];
  } else {
    options.tags = [];
  }

  // Date range
  options.dateFrom = isValidDateString(params.dateFrom) ? params.dateFrom : null;
  options.dateTo = isValidDateString(params.dateTo) ? params.dateTo : null;

  // Validate date range order
  if (options.dateFrom && options.dateTo) {
    if (new Date(options.dateFrom) > new Date(options.dateTo)) {
      // Swap if from > to
      [options.dateFrom, options.dateTo] = [options.dateTo, options.dateFrom];
    }
  }

  // Camera make — allow any string, sanitize length
  options.cameraMake =
    typeof params.cameraMake === 'string' ? params.cameraMake.trim().slice(0, 100) : '';

  // GPS filter — truthy string values
  options.hasGps = params.hasGps === 'true' || params.hasGps === '1' || params.hasGps === 'on';

  // Pagination
  const parsedPage = parseInt(params.page, 10);
  options.page = !isNaN(parsedPage) && parsedPage > 0 ? parsedPage : DEFAULT_PAGE;

  const parsedLimit = parseInt(params.limit, 10);
  options.limit =
    !isNaN(parsedLimit) && parsedLimit > 0
      ? Math.min(parsedLimit, MAX_LIMIT)
      : DEFAULT_LIMIT;

  // Sort order
  options.sortBy =
    typeof params.sortBy === 'string' && VALID_SORT_OPTIONS.includes(params.sortBy)
      ? params.sortBy
      : 'relevance';

  return options;
}

/**
 * Serialize search options back to a query string (for pagination links, etc.)
 *
 * @param {Object} options - Structured search options
 * @param {Object} overrides - Values to override
 * @returns {string} Query string (without leading '?')
 */
function serializeSearchOptions(options = {}, overrides = {}) {
  const merged = { ...options, ...overrides };
  const params = new URLSearchParams();

  if (merged.q) params.set('q', merged.q);
  if (Array.isArray(merged.tags) && merged.tags.length > 0) {
    merged.tags.forEach((id) => params.append('tags', id));
  }
  if (merged.dateFrom) params.set('dateFrom', merged.dateFrom);
  if (merged.dateTo) params.set('dateTo', merged.dateTo);
  if (merged.cameraMake) params.set('cameraMake', merged.cameraMake);
  if (merged.hasGps) params.set('hasGps', 'true');
  if (merged.page && merged.page !== 1) params.set('page', merged.page);
  if (merged.limit && merged.limit !== DEFAULT_LIMIT) params.set('limit', merged.limit);
  if (merged.sortBy && merged.sortBy !== 'relevance') params.set('sortBy', merged.sortBy);

  return params.toString();
}

/**
 * Build an active filters summary for display in the UI.
 *
 * @param {Object} options - Structured search options
 * @param {Object} facets - Facets data (tags with names)
 * @returns {Array} Array of { label, key } objects
 */
function buildActiveFilterSummary(options = {}, facets = {}) {
  const active = [];

  if (options.q) {
    active.push({ label: `Search: "${options.q}"`, key: 'q' });
  }

  if (options.dateFrom && options.dateTo) {
    active.push({ label: `Date: ${options.dateFrom} – ${options.dateTo}`, key: 'date' });
  } else if (options.dateFrom) {
    active.push({ label: `From: ${options.dateFrom}`, key: 'dateFrom' });
  } else if (options.dateTo) {
    active.push({ label: `To: ${options.dateTo}`, key: 'dateTo' });
  }

  if (options.cameraMake) {
    active.push({ label: `Camera: ${options.cameraMake}`, key: 'cameraMake' });
  }

  if (options.hasGps) {
    active.push({ label: 'Has GPS', key: 'hasGps' });
  }

  if (Array.isArray(options.tags) && options.tags.length > 0) {
    const tagMap = {};
    if (facets.tags) {
      facets.tags.forEach((t) => {
        tagMap[t.id] = t.name;
      });
    }
    options.tags.forEach((tagId) => {
      const name = tagMap[tagId] || `Tag #${tagId}`;
      active.push({ label: `Tag: ${name}`, key: `tag_${tagId}` });
    });
  }

  return active;
}

/**
 * Check if a value is a valid date string (YYYY-MM-DD format).
 */
function isValidDateString(value) {
  if (typeof value !== 'string' || !value.trim()) return false;
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(value.trim())) return false;
  const date = new Date(value.trim());
  return !isNaN(date.getTime());
}

/**
 * Count how many active filters are set (for badge display).
 */
function countActiveFilters(options = {}) {
  let count = 0;
  if (options.q) count++;
  if (options.dateFrom || options.dateTo) count++;
  if (options.cameraMake) count++;
  if (options.hasGps) count++;
  if (Array.isArray(options.tags) && options.tags.length > 0) count++;
  return count;
}

module.exports = {
  buildSearchOptions,
  serializeSearchOptions,
  buildActiveFilterSummary,
  countActiveFilters,
  isValidDateString,
};