/**
 * Format aperture value (FNumber) to standard f/ notation
 * @param {number|string} value - e.g. 2.8 or "2.8"
 * @returns {string}
 */
function formatAperture(value) {
  if (value == null) return '';
  const num = parseFloat(value);
  if (isNaN(num)) return String(value);
  return `f/${num % 1 === 0 ? num.toFixed(0) : num.toFixed(1)}`;
}

/**
 * Format shutter speed to standard notation
 * @param {number|string} value - e.g. 0.001 or "1/1000"
 * @returns {string}
 */
function formatShutterSpeed(value) {
  if (value == null) return '';

  // Already formatted as fraction string
  if (typeof value === 'string' && value.includes('/')) {
    return `${value}s`;
  }

  const num = parseFloat(value);
  if (isNaN(num)) return String(value);

  if (num >= 1) {
    return `${num}s`;
  }

  // Convert to fraction
  const denominator = Math.round(1 / num);
  return `1/${denominator}s`;
}

/**
 * Format focal length
 * @param {number|string} value - e.g. 50 or "50"
 * @returns {string}
 */
function formatFocalLength(value) {
  if (value == null) return '';
  const num = parseFloat(value);
  if (isNaN(num)) return String(value);
  return `${Math.round(num)}mm`;
}

/**
 * Format GPS coordinates to DMS notation
 * @param {number} lat
 * @param {number} lng
 * @returns {string}
 */
function formatGps(lat, lng) {
  if (lat == null || lng == null) return '';

  function toDms(decimal, isLat) {
    const abs = Math.abs(decimal);
    const degrees = Math.floor(abs);
    const minutesFloat = (abs - degrees) * 60;
    const minutes = Math.floor(minutesFloat);
    const seconds = ((minutesFloat - minutes) * 60).toFixed(1);
    const direction = isLat
      ? (decimal >= 0 ? 'N' : 'S')
      : (decimal >= 0 ? 'E' : 'W');
    return `${degrees}° ${minutes}' ${seconds}" ${direction}`;
  }

  return `${toDms(lat, true)}, ${toDms(lng, false)}`;
}

/**
 * Format file size in human-readable form
 * @param {number} bytes
 * @returns {string}
 */
function formatFileSize(bytes) {
  if (bytes == null) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/**
 * Format ISO speed
 * @param {number|string} value
 * @returns {string}
 */
function formatIso(value) {
  if (value == null) return '';
  return `ISO ${value}`;
}

/**
 * Format exposure bias/compensation
 * @param {number|string} value
 * @returns {string}
 */
function formatExposureBias(value) {
  if (value == null) return '';
  const num = parseFloat(value);
  if (isNaN(num)) return String(value);
  if (num === 0) return '0 EV';
  return `${num > 0 ? '+' : ''}${num.toFixed(1)} EV`;
}

module.exports = {
  formatAperture,
  formatShutterSpeed,
  formatFocalLength,
  formatGps,
  formatFileSize,
  formatIso,
  formatExposureBias,
};