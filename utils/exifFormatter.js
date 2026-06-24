/**
 * Format GPS coordinates to a human-readable string.
 * @param {{ lat: number, lng: number }} gps
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
 * Format a decimal shutter speed to a fraction string.
 * @param {number} value - Shutter speed in seconds (e.g. 0.004)
 * @returns {string} e.g. '1/250s'
 */
function formatShutter(value) {
  if (value == null) return null;

  if (value >= 1) {
    return `${value}s`;
  }

  const denominator = Math.round(1 / value);
  return `1/${denominator}s`;
}

/**
 * Format an ISO date string or Date object to a locale-friendly string.
 * @param {string|Date} isoString
 * @returns {string} Locale date string
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
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return null;
  }
}

module.exports = { formatGPS, formatShutter, formatDate };