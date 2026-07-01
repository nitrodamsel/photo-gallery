'use strict';

/**
 * queryBuilder.js
 *
 * Converts flat query-string param objects (as Express gives us via req.query)
 * into a typed, validated search-options object suitable for searchService.search().
 */

const DEFAULT_PAGE  = 1;
const DEFAULT_LIMIT = 24;
const MAX_LIMIT     = 100;

/**
 * @param {object} query - raw req.query object
 * @returns {object}     - structured search options
 */
function buildSearchOptions(query = {}) {
  return {
    q:          parseString(query.q),
    tags:       parseStringArray(query.tags),
    dateFrom:   parseDate(query.dateFrom),
    dateTo:     parseDate(query.dateTo),
    cameraMake: parseString(query.cameraMake),
    hasGps:     parseBoolean(query.hasGps),
    page:       parsePage(query.page),
    limit:      parseLimit(query.limit),
  };
}

/**
 * Converts search-options back into a plain object suitable for serialising
 * into a query string (omits falsy / default values to keep URLs clean).
 *
 * @param {object} opts
 * @returns {object}
 */
function searchOptionsToQuery(opts = {}) {
  const out = {};

  if (opts.q)          out.q          = opts.q;
  if (opts.tags && opts.tags.length)  out.tags = opts.tags;
  if (opts.dateFrom)   out.dateFrom   = opts.dateFrom;
  if (opts.dateTo)     out.dateTo     = opts.dateTo;
  if (opts.cameraMake) out.cameraMake = opts.cameraMake;
  if (opts.hasGps)     out.hasGps     = '1';
  if (opts.page && opts.page !== DEFAULT_PAGE)   out.page  = String(opts.page);
  if (opts.limit && opts.limit !== DEFAULT_LIMIT) out.limit = String(opts.limit);

  return out;
}

/**
 * Builds a human-readable summary of active filters for display in the UI.
 *
 * @param {object} opts - structured search options
 * @returns {string[]}  - array of label strings
 */
function buildFilterSummary(opts = {}) {
  const labels = [];

  if (opts.q)          labels.push(`Search: "${opts.q}"`);
  if (opts.dateFrom && opts.dateTo) {
    labels.push(`Date: ${opts.dateFrom} — ${opts.dateTo}`);
  } else if (opts.dateFrom) {
    labels.push(`From: ${opts.dateFrom}`);
  } else if (opts.dateTo) {
    labels.push(`To: ${opts.dateTo}`);
  }
  if (opts.cameraMake) labels.push(`Camera: ${opts.cameraMake}`);
  if (opts.hasGps)     labels.push('Has GPS');
  if (opts.tags && opts.tags.length) {
    labels.push(`Tags: ${opts.tags.join(', ')}`);
  }

  return labels;
}

// ── Type helpers ─────────────────────────────────────────────────────────────

function parseString(val) {
  if (val === undefined || val === null) return '';
  return String(val).trim();
}

function parseStringArray(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val.map((v) => String(v).trim()).filter(Boolean);
  // comma-separated or single value
  return String(val).split(',').map((v) => v.trim()).filter(Boolean);
}

function parseDate(val) {
  if (!val) return null;
  const s = String(val).trim();
  // Validate YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(s);
  if (isNaN(d.getTime())) return null;
  return s;
}

function parseBoolean(val) {
  if (val === undefined || val === null || val === '') return false;
  if (val === true  || val === 1) return true;
  if (val === false || val === 0) return false;
  return ['1', 'true', 'yes', 'on'].includes(String(val).toLowerCase());
}

function parsePage(val) {
  const n = parseInt(val, 10);
  return (isFinite(n) && n >= 1) ? n : DEFAULT_PAGE;
}

function parseLimit(val) {
  const n = parseInt(val, 10);
  if (!isFinite(n) || n < 1) return DEFAULT_LIMIT;
  return Math.min(n, MAX_LIMIT);
}

module.exports = {
  buildSearchOptions,
  searchOptionsToQuery,
  buildFilterSummary,
};