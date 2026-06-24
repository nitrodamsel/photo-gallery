const fs = require('fs');
const path = require('path');

/**
 * Ensure a directory exists, creating it (and parents) if necessary.
 * @param {string} dirPath - Absolute or relative path to directory
 */
async function ensureDir(dirPath) {
  await fs.promises.mkdir(dirPath, { recursive: true });
}

/**
 * Safely delete a file, swallowing any errors (e.g. file not found).
 * @param {string} filePath - Absolute or relative path to file
 */
async function safeDelete(filePath) {
  if (!filePath) return;
  try {
    await fs.promises.unlink(filePath);
  } catch (err) {
    // Swallow errors — file may not exist or already deleted
    if (err.code !== 'ENOENT') {
      console.warn(`[fileHelpers] safeDelete failed for ${filePath}:`, err.message);
    }
  }
}

/**
 * Convert an absolute file path within the project to a /uploads-relative public URL.
 * @param {string} filePath - Absolute path to the file
 * @returns {string} Public URL path starting with /uploads/...
 */
function getPublicUrl(filePath) {
  if (!filePath) return null;

  // Normalise separators on Windows
  const normalised = filePath.replace(/\\/g, '/');

  // Find the 'uploads' segment and return from there
  const uploadsIndex = normalised.lastIndexOf('/uploads/');
  if (uploadsIndex !== -1) {
    return normalised.substring(uploadsIndex);
  }

  // Fallback: just return the basename
  return `/uploads/${path.basename(filePath)}`;
}

module.exports = { ensureDir, safeDelete, getPublicUrl };