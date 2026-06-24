const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');

/**
 * Ensure a directory exists, creating it (and any parent dirs) if needed.
 * @param {string} dirPath - Absolute or relative path to directory
 */
async function ensureDir(dirPath) {
  await fsp.mkdir(dirPath, { recursive: true });
}

/**
 * Safely delete a file, swallowing any errors (e.g. file already gone).
 * @param {string} filePath - Path to file to delete
 */
async function safeDelete(filePath) {
  if (!filePath) return;
  try {
    await fsp.unlink(filePath);
  } catch (err) {
    // Swallow errors — file may already be deleted or never existed
    if (err.code !== 'ENOENT') {
      console.warn(`[fileHelpers] safeDelete warning for ${filePath}:`, err.message);
    }
  }
}

/**
 * Convert an absolute file path to a public /uploads-relative URL.
 * @param {string} filePath - Absolute path within the project
 * @returns {string} Public URL path like /uploads/originals/2024-01/abc.jpg
 */
function getPublicUrl(filePath) {
  if (!filePath) return null;

  // Normalize separators
  const normalized = filePath.replace(/\\/g, '/');

  // Find the 'uploads/' segment and return from there
  const uploadsIndex = normalized.indexOf('uploads/');
  if (uploadsIndex !== -1) {
    return '/' + normalized.slice(uploadsIndex);
  }

  // Fallback: return just the basename
  return '/uploads/' + path.basename(filePath);
}

module.exports = { ensureDir, safeDelete, getPublicUrl };