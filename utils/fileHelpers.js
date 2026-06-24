const fs = require('fs');
const path = require('path');

/**
 * Ensure a directory exists, creating it recursively if necessary.
 * @param {string} dirPath - Absolute path to directory
 */
async function ensureDir(dirPath) {
  await fs.promises.mkdir(dirPath, { recursive: true });
}

/**
 * Safely delete a file, swallowing errors if the file does not exist.
 * @param {string} filePath - Absolute path to file
 */
async function safeDelete(filePath) {
  if (!filePath) return;
  try {
    await fs.promises.unlink(filePath);
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.warn(`[safeDelete] Could not delete file ${filePath}:`, err.message);
    }
  }
}

/**
 * Convert an absolute file path within the project to a public /uploads/... URL.
 * @param {string} absolutePath - Absolute path to a file inside the uploads directory
 * @returns {string} Public URL path starting with /uploads/
 */
function getPublicUrl(absolutePath) {
  if (!absolutePath) return null;

  // Normalize separators
  const normalized = absolutePath.replace(/\\/g, '/');
  const uploadsIndex = normalized.lastIndexOf('/uploads/');

  if (uploadsIndex === -1) {
    // Fallback: return as-is
    return absolutePath;
  }

  return normalized.substring(uploadsIndex);
}

module.exports = { ensureDir, safeDelete, getPublicUrl };