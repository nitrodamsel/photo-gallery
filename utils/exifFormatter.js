/**
 * Format GPS coordinates into a human-readable string.
 * @param {{ lat: number, lng: number }} coords
 * @returns {string} e.g. '48.8566° N, 2.3522° E'
 */
function formatGPS({ lat, lng }) {
  if (lat == null || lng == null) return null;

  const latDir = lat >= 0 ? 'N' : 'S';
  const lngDir = lng >= 0 ? 'E' : 'W';
  const absLat = Math.abs(lat).toFixed(4);
  const absLng = Math.abs(lng).toFixed(4);

  return `${absLat}° ${latDir}, ${absLng}° ${lngDir}`;
}

/**
 * Format a shutter speed value (in seconds) to a fraction string.
 * @param {number} value - Shutter speed in seconds (e.g. 0.004)
 * @returns {string} e.g. '1/250s'
 */
function formatShutter(value) {
  if (value == null) return null;

  if (value >= 1) {
    return `${value}s`;
  }

  // Convert decimal to fraction (1/x)
  const denominator = Math.round(1 / value);
  return `1/${denominator}s`;
}

/**
 * Format an ISO date string or Date object to a locale-friendly string.
 * @param {string|Date} isoString
 * @returns {string} e.g. 'June 25, 2026, 3:45 PM'
 */
function formatDate(isoString) {
  if (!isoString) return null;

  try {
    const date = isoString instanceof Date ? isoString : new Date(isoString);
    if (isNaN(date.getTime())) return null;

    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return null;
  }
}

/**
 * Format aperture value (f-number) to a string.
 * @param {number} value - f-number (e.g. 2.8)
 * @returns {string} e.g. 'f/2.8'
 */
function formatAperture(value) {
  if (value == null) return null;
  return `f/${value}`;
}

/**
 * Format focal length in mm.
 * @param {number} value
 * @returns {string} e.g. '50mm'
 */
function formatFocalLength(value) {
  if (value == null) return null;
  return `${value}mm`;
}

module.exports = { formatGPS, formatShutter, formatDate, formatAperture, formatFocalLength };