/**
 * queryBuilder.js
 * Pure helper that converts flat query-string params into a structured
 * search options object with type coercion and defaults.
 */

const DEFAULTS = {
  page: 1,
  limit: 24,
  sortBy: 'relevance',
};

const MAX_LIMIT = 100;
const MIN_LIMIT = 1;

/**
 * Build a structured search options object from raw query-string params.
 * @param {Object} params - Raw query-string object (req.query)
 * @returns {Object} Structured and validated search options
 */
function buildSearchOptions(params = {}) {
  const options = {};

  // Search query string
  options.q = typeof params.q === 'string' ? params.q.trim().slice(0, 500) : '';

  // Tags — can be string or array
  if (params.tags) {
    const rawTags = Array.isArray(params.tags) ? params.tags : [params.tags];
    options.tags = rawTags
      .map(t => (typeof t === 'string' ? t.trim() : ''))
      .filter(t => t.length > 0)
      .slice(0, 50); // max 50 tags
  } else {
    options.tags = [];
  }

  // Date range
  options.dateFrom = parseDate(params.dateFrom);
  options.dateTo = parseDate(params.dateTo);

  // Swap dates if reversed
  if (options.dateFrom && options.dateTo && options.dateFrom > options.dateTo) {
    [options.dateFrom, options.dateTo] = [options.dateTo, options.dateFrom];
  }

  // Camera make
  options.cameraMake =
    typeof params.cameraMake === 'string' ? params.cameraMake.trim().slice(0, 100) : '';

  // Has GPS — tri-state: true, false, or null (any)
  if (params.hasGps === 'true' || params.hasGps === '1') {
    options.hasGps = true;
  } else if (params.hasGps === 'false' || params.hasGps === '0') {
    options.hasGps = false;
  } else {
    options.hasGps = null;
  }

  // Pagination
  options.page = parsePositiveInt(params.page, DEFAULTS.page);
  options.limit = clamp(
    parsePositiveInt(params.limit, DEFAULTS.limit),
    MIN_LIMIT,
    MAX_LIMIT
  );

  // Sort
  const validSortOptions = ['relevance', 'date_desc', 'date_asc', 'name_asc', 'name_desc'];
  options.sortBy = validSortOptions.includes(params.sortBy)
    ? params.sortBy
    : DEFAULTS.sortBy;

  return options;
}

/**
 * Convert structured search options back to a query-string params object
 * (for building URLs/links)
 * @param {Object} options - Structured search options
 * @returns {Object} Flat params object suitable for URL serialization
 */
function searchOptionsToParams(options = {}) {
  const params = {};

  if (options.q) params.q = options.q;
  if (options.tags && options.tags.length > 0) params.tags = options.tags;
  if (options.dateFrom) params.dateFrom = formatDate(options.dateFrom);
  if (options.dateTo) params.dateTo = formatDate(options.dateTo);
  if (options.cameraMake) params.cameraMake = options.cameraMake;
  if (options.hasGps !== null && options.hasGps !== undefined) {
    params.hasGps = options.hasGps ? 'true' : 'false';
  }
  if (options.page && options.page !== 1) params.page = String(options.page);
  if (options.limit && options.limit !== 24) params.limit = String(options.limit);
  if (options.sortBy && options.sortBy !== 'relevance') params.sortBy = options.sortBy;

  return params;
}

/**
 * Build a URL query string from search options
 * @param {Object} options - Structured search options
 * @param {Object} overrides - Override specific values
 * @returns {string} URL query string (without leading ?)
 */
function buildQueryString(options = {}, overrides = {}) {
  const params = searchOptionsToParams({ ...options, ...overrides });
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      value.forEach(v => qs.append(key, v));
    } else {
      qs.set(key, value);
    }
  }
  return qs.toString();
}

// ---- Helpers ----

function parsePositiveInt(value, defaultVal) {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultVal;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function parseDate(value) {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  // Validate YYYY-MM-DD format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  const date = new Date(trimmed);
  return isNaN(date.getTime()) ? null : trimmed;
}

function formatDate(value) {
  if (!value) return null;
  if (typeof value === 'string') return value;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

module.exports = { buildSearchOptions, searchOptionsToParams, buildQueryString };