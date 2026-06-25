const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');

/**
 * Ensures a directory exists, creating it recursively if needed.
 * @param {string} dirPath - Absolute or relative path to the directory.
 */
async function ensureDir(dirPath) {
  await fsp.mkdir(dirPath, { recursive: true });
}

/**
 * Safely deletes a file, swallowing errors if the file doesn't exist.
 * @param {string} filePath - Path to the file to delete.
 */
async function safeDelete(filePath) {
  if (!filePath) return;
  try {
    await fsp.unlink(filePath);
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.warn(`[fileHelpers] safeDelete failed for "${filePath}":`, err.message);
    }
  }
}

/**
 * Converts an absolute file path to a public /uploads relative URL.
 * @param {string} filePath - Absolute path containing "uploads" directory.
 * @returns {string} Public URL path like /uploads/originals/2024-01/uuid.jpg
 */
function getPublicUrl(filePath) {
  if (!filePath) return null;
  const normalized = filePath.replace(/\\/g, '/');
  const uploadsIndex = normalized.lastIndexOf('/uploads/');
  if (uploadsIndex === -1) {
    // Fallback: just return filename
    return `/uploads/${path.basename(filePath)}`;
  }
  return normalized.substring(uploadsIndex);
}

module.exports = {
  ensureDir,
  safeDelete,
  getPublicUrl,
};