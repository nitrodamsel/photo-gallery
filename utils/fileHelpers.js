const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');

/**
 * Ensures a directory exists, creating it recursively if necessary.
 * @param {string} dirPath - Absolute path to the directory.
 */
async function ensureDir(dirPath) {
  await fsp.mkdir(dirPath, { recursive: true });
}

/**
 * Safely deletes a file, swallowing any errors (e.g. file not found).
 * @param {string} filePath - Absolute path to the file.
 */
async function safeDelete(filePath) {
  if (!filePath) return;
  try {
    await fsp.unlink(filePath);
  } catch (err) {
    // Swallow errors — file may not exist or may already be deleted
    if (err.code !== 'ENOENT') {
      console.warn(`[fileHelpers] safeDelete warning for "${filePath}": ${err.message}`);
    }
  }
}

/**
 * Converts an absolute file path to a public URL relative to the uploads directory.
 * @param {string} filePath - Absolute path to the file.
 * @returns {string} URL path starting with /uploads/...
 */
function getPublicUrl(filePath) {
  if (!filePath) return null;
  // Normalize separators for cross-platform compatibility
  const normalized = filePath.replace(/\\/g, '/');
  const uploadsIndex = normalized.indexOf('/uploads/');
  if (uploadsIndex !== -1) {
    return normalized.slice(uploadsIndex);
  }
  // Fallback: try to find 'uploads' segment
  const parts = normalized.split('/');
  const idx = parts.lastIndexOf('uploads');
  if (idx !== -1) {
    return '/' + parts.slice(idx).join('/');
  }
  return '/' + path.basename(filePath);
}

module.exports = { ensureDir, safeDelete, getPublicUrl };