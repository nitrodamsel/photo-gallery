const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');

/**
 * Ensure that a directory exists, creating it (and any parents) if necessary.
 * @param {string} dirPath - Absolute or relative path to the directory
 */
async function ensureDir(dirPath) {
  await fsp.mkdir(dirPath, { recursive: true });
}

/**
 * Safely delete a file, swallowing any errors (e.g. file not found).
 * @param {string} filePath - Path to the file to delete
 */
async function safeDelete(filePath) {
  if (!filePath) return;
  try {
    await fsp.unlink(filePath);
  } catch (err) {
    // Swallow errors — file may not exist or may already be deleted
    if (err.code !== 'ENOENT') {
      console.warn(`[fileHelpers] safeDelete warning for ${filePath}:`, err.message);
    }
  }
}

/**
 * Convert an absolute file path inside the project's uploads directory
 * to a public-facing relative URL.
 *
 * e.g. /app/uploads/originals/2026-06/uuid.jpg → /uploads/originals/2026-06/uuid.jpg
 *
 * @param {string} filePath - Absolute path to the file
 * @returns {string} Public URL path starting with /uploads/
 */
function getPublicUrl(filePath) {
  if (!filePath) return null;

  // Normalize separators to forward slashes
  const normalized = filePath.replace(/\\/g, '/');

  // Find the /uploads/ segment and return everything from there
  const uploadsIndex = normalized.indexOf('/uploads/');
  if (uploadsIndex !== -1) {
    return normalized.slice(uploadsIndex);
  }

  // Fallback: just return the basename under /uploads/
  return `/uploads/${path.basename(filePath)}`;
}

module.exports = { ensureDir, safeDelete, getPublicUrl };