const exifr = require('exifr');
const { formatShutter } = require('../utils/exifFormatter');

/**
 * Extracts and normalizes EXIF metadata from an image file.
 * @param {string} filePath - Absolute path to the image file.
 * @returns {Promise<Object>} Structured EXIF data or empty object on failure.
 */
async function extractExif(filePath) {
  try {
    const raw = await exifr.parse(filePath, {
      // GPS
      gps: true,
      // EXIF tags to extract
      pick: [
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
        'ExposureProgram',
        'MeteringMode',
        'Flash',
        'WhiteBalance',
        'GPSLatitude',
        'GPSLongitude',
        'GPSLatitudeRef',
        'GPSLongitudeRef',
        'GPSAltitude',
        'Software',
      ],
    });

    if (!raw) {
      return {};
    }

    // Normalize GPS
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

    // Normalize date
    const dateTaken =
      raw.DateTimeOriginal || raw.CreateDate
        ? (raw.DateTimeOriginal || raw.CreateDate).toISOString
          ? (raw.DateTimeOriginal || raw.CreateDate).toISOString()
          : String(raw.DateTimeOriginal || raw.CreateDate)
        : null;

    // Normalize shutter speed
    const shutterSpeed =
      raw.ExposureTime != null ? formatShutter(raw.ExposureTime) : null;

    // Normalize aperture
    const aperture = raw.FNumber != null ? `f/${raw.FNumber}` : null;

    // Normalize focal length
    const focalLength = raw.FocalLength != null ? `${raw.FocalLength}mm` : null;

    const result = {
      cameraMake: raw.Make || null,
      cameraModel: raw.Model || null,
      lens: raw.LensModel || null,
      focalLength,
      aperture,
      shutterSpeed,
      iso: raw.ISO || null,
      dateTaken,
      colorSpace: normalizeColorSpace(raw.ColorSpace),
      orientation: raw.Orientation || null,
      gps,
      imageWidth: raw.ImageWidth || null,
      imageHeight: raw.ImageHeight || null,
      software: raw.Software || null,
    };

    // Remove null values to keep the object clean
    return Object.fromEntries(
      Object.entries(result).filter(([, v]) => v !== null && v !== undefined)
    );
  } catch (err) {
    console.warn('[exifService] Failed to extract EXIF data:', err.message);
    return {};
  }
}

/**
 * Converts DMS (Degrees, Minutes, Seconds) array to Decimal Degrees.
 */
function convertDMSToDD(dms, ref) {
  if (!Array.isArray(dms) || dms.length < 3) return null;
  const [degrees, minutes, seconds] = dms;
  let dd = degrees + minutes / 60 + seconds / 3600;
  if (ref === 'S' || ref === 'W') {
    dd = -dd;
  }
  return dd;
}

/**
 * Normalizes color space value.
 */
function normalizeColorSpace(value) {
  if (value == null) return null;
  const colorSpaceMap = {
    1: 'sRGB',
    2: 'Adobe RGB',
    65535: 'Uncalibrated',
  };
  if (typeof value === 'number') {
    return colorSpaceMap[value] || `Unknown (${value})`;
  }
  return String(value);
}

module.exports = {
  extractExif,
};