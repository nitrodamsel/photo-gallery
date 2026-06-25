const fs = require('fs');
const path = require('path');

/**
 * Ensure a directory exists, creating it recursively if needed.
 * @param {string} dirPath - Absolute or relative path to the directory.
 */
async function ensureDir(dirPath) {
  await fs.promises.mkdir(dirPath, { recursive: true });
}

/**
 * Delete a file, swallowing any errors (e.g., file not found).
 * @param {string} filePath - Path to the file to delete.
 */
async function safeDelete(filePath) {
  if (!filePath) return;
  try {
    await fs.promises.unlink(filePath);
  } catch (err) {
    // Swallow errors — file may not exist or already be deleted
    if (err.code !== 'ENOENT') {
      console.warn(`[fileHelpers] safeDelete warning for "${filePath}": ${err.message}`);
    }
  }
}

/**
 * Convert an absolute file path within the project's uploads directory
 * to a public-facing /uploads/... URL.
 * @param {string} filePath - Absolute path to the file.
 * @returns {string} Public URL path starting with /uploads/
 */
function getPublicUrl(filePath) {
  if (!filePath) return null;

  // Normalize separators to forward slashes
  const normalized = filePath.replace(/\\/g, '/');

  // Find the 'uploads' segment and return everything from there
  const uploadsIndex = normalized.indexOf('/uploads/');
  if (uploadsIndex !== -1) {
    return normalized.slice(uploadsIndex);
  }

  // Fallback: try to find 'uploads' without leading slash
  const altIndex = normalized.indexOf('uploads/');
  if (altIndex !== -1) {
    return '/' + normalized.slice(altIndex);
  }

  return '/' + normalized;
}

module.exports = { ensureDir, safeDelete, getPublicUrl };