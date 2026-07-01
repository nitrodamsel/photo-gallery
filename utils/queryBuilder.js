/**
 * Converts flat query-string params object into structured search options
 * with type coercion and defaults.
 */

const DEFAULT_LIMIT = 24;
const DEFAULT_PAGE = 1;

/**
 * @param {Object} params - raw query string params from req.query
 * @returns {Object} structured search options
 */
function buildSearchOptions(params = {}) {
  const options = {};

  // Text query
  options.q = typeof params.q === 'string' ? params.q.trim() : '';

  // Tags — can be string or array
  if (params.tags) {
    if (Array.isArray(params.tags)) {
      options.tags = params.tags.map((t) => t.trim()).filter(Boolean);
    } else if (typeof params.tags === 'string') {
      options.tags = params.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
    } else {
      options.tags = [];
    }
  } else {
    options.tags = [];
  }

  // Date range
  options.dateFrom = isValidDate(params.dateFrom) ? params.dateFrom : null;
  options.dateTo = isValidDate(params.dateTo) ? params.dateTo : null;

  // Camera make
  options.cameraMake =
    typeof params.cameraMake === 'string' && params.cameraMake !== 'any'
      ? params.cameraMake.trim()
      : '';

  // Has GPS (boolean coercion)
  options.hasGps =
    params.hasGps === 'true' || params.hasGps === '1' || params.hasGps === 'on' ? true : false;

  // Pagination
  const parsedPage = parseInt(params.page, 10);
  options.page = !isNaN(parsedPage) && parsedPage > 0 ? parsedPage : DEFAULT_PAGE;

  const parsedLimit = parseInt(params.limit, 10);
  options.limit =
    !isNaN(parsedLimit) && parsedLimit > 0 && parsedLimit <= 100 ? parsedLimit : DEFAULT_LIMIT;

  // Sort
  options.sort = ['newest', 'oldest', 'relevance'].includes(params.sort)
    ? params.sort
    : 'relevance';

  return options;
}

/**
 * Checks if a string is a valid date in YYYY-MM-DD format
 */
function isValidDate(str) {
  if (!str || typeof str !== 'string') return false;
  const match = str.match(/^\d{4}-\d{2}-\d{2}$/);
  if (!match) return false;
  const d = new Date(str);
  return !isNaN(d.getTime());
}

/**
 * Serializes search options back to query string format
 */
function serializeToQueryString(options = {}) {
  const params = new URLSearchParams();

  if (options.q) params.set('q', options.q);
  if (options.tags && options.tags.length > 0) {
    options.tags.forEach((tag) => params.append('tags', tag));
  }
  if (options.dateFrom) params.set('dateFrom', options.dateFrom);
  if (options.dateTo) params.set('dateTo', options.dateTo);
  if (options.cameraMake) params.set('cameraMake', options.cameraMake);
  if (options.hasGps) params.set('hasGps', 'true');
  if (options.page && options.page > 1) params.set('page', String(options.page));
  if (options.limit && options.limit !== 24) params.set('limit', String(options.limit));
  if (options.sort && options.sort !== 'relevance') params.set('sort', options.sort);

  return params.toString();
}

module.exports = { buildSearchOptions, serializeToQueryString, isValidDate };