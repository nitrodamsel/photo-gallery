const exifr = require('exifr');
const { formatShutter } = require('../utils/exifFormatter');

const EXIF_TAGS = [
  'GPSLatitude',
  'GPSLongitude',
  'GPSLatitudeRef',
  'GPSLongitudeRef',
  'Make',
  'Model',
  'LensModel',
  'FocalLength',
  'FNumber',
  'ExposureTime',
  'ISO',
  'DateTimeOriginal',
  'CreateDate',
  'ColorSpace',
  'Orientation',
  'ImageWidth',
  'ImageHeight',
  'ExifImageWidth',
  'ExifImageHeight',
  'Software',
  'Artist',
  'Copyright',
];

/**
 * Extract and normalize EXIF metadata from an image file.
 * @param {string} filePath - Absolute path to the image file
 * @returns {Promise<Object>} Normalized EXIF data, or {} on failure
 */
async function extractExif(filePath) {
  try {
    const raw = await exifr.parse(filePath, {
      pick: EXIF_TAGS,
      gps: true,
      tiff: true,
      exif: true,
      ifd1: false,
      sanitize: true,
      reviveValues: true,
    });

    if (!raw) return {};

    // Normalize GPS coordinates
    let gps = null;
    if (raw.latitude != null && raw.longitude != null) {
      gps = {
        lat: raw.latitude,
        lng: raw.longitude,
      };
    } else if (raw.GPSLatitude != null && raw.GPSLongitude != null) {
      // Manual calculation if needed
      const lat = convertDMSToDD(raw.GPSLatitude, raw.GPSLatitudeRef);
      const lng = convertDMSToDD(raw.GPSLongitude, raw.GPSLongitudeRef);
      if (lat != null && lng != null) {
        gps = { lat, lng };
      }
    }

    // Normalize date taken
    const dateTaken =
      raw.DateTimeOriginal || raw.CreateDate || null;

    // Normalize shutter speed
    const shutterRaw = raw.ExposureTime;
    const shutterFormatted = shutterRaw != null ? formatShutter(shutterRaw) : null;

    // Build structured output
    const normalized = {
      camera: {
        make: raw.Make || null,
        model: raw.Model || null,
      },
      lens: raw.LensModel || null,
      focalLength: raw.FocalLength != null ? `${raw.FocalLength}mm` : null,
      aperture: raw.FNumber != null ? `f/${raw.FNumber}` : null,
      shutterSpeed: shutterFormatted,
      shutterSpeedRaw: shutterRaw || null,
      iso: raw.ISO || null,
      dateTaken: dateTaken ? dateTaken.toISOString() : null,
      colorSpace: raw.ColorSpace != null ? String(raw.ColorSpace) : null,
      orientation: raw.Orientation || null,
      dimensions: {
        width:
          raw.ExifImageWidth || raw.ImageWidth || null,
        height:
          raw.ExifImageHeight || raw.ImageHeight || null,
      },
      gps,
      software: raw.Software || null,
      artist: raw.Artist || null,
      copyright: raw.Copyright || null,
      raw: raw,
    };

    return normalized;
  } catch (err) {
    console.warn(`[exifService] Failed to parse EXIF from ${filePath}:`, err.message);
    return {};
  }
}

/**
 * Convert DMS (Degrees, Minutes, Seconds) array to decimal degrees.
 * @param {number[]} dms - [degrees, minutes, seconds]
 * @param {string} ref - 'N', 'S', 'E', 'W'
 * @returns {number|null}
 */
function convertDMSToDD(dms, ref) {
  if (!Array.isArray(dms) || dms.length < 3) return null;
  const [degrees, minutes, seconds] = dms;
  let dd = degrees + minutes / 60 + seconds / 3600;
  if (ref === 'S' || ref === 'W') dd = -dd;
  return dd;
}

module.exports = { extractExif };