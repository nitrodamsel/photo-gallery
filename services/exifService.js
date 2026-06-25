const exifr = require('exifr');
const { formatShutter } = require('../utils/exifFormatter');

/**
 * Extract and normalize EXIF metadata from an image file.
 *
 * @param {string} filePath - Absolute path to the image file
 * @returns {Promise<Object>} Normalized EXIF data object, or {} on failure
 */
async function extractExif(filePath) {
  try {
    const raw = await exifr.parse(filePath, {
      // Explicitly request the tags we care about
      pick: [
        // GPS
        'GPSLatitude',
        'GPSLongitude',
        'GPSLatitudeRef',
        'GPSLongitudeRef',
        'GPSAltitude',
        // Camera
        'Make',
        'Model',
        'LensModel',
        'LensMake',
        // Exposure
        'FocalLength',
        'FNumber',
        'ApertureValue',
        'ExposureTime',
        'ShutterSpeedValue',
        'ISOSpeedRatings',
        'ISO',
        // Date
        'DateTimeOriginal',
        'DateTimeDigitized',
        'DateTime',
        // Color / orientation
        'ColorSpace',
        'Orientation',
        // Additional
        'ExposureMode',
        'WhiteBalance',
        'Flash',
        'MeteringMode',
        'Software',
        'ImageWidth',
        'ImageHeight',
        'ExifImageWidth',
        'ExifImageHeight',
      ],
      // Parse GPS into usable lat/lng
      gps: true,
    });

    if (!raw) return {};

    // Normalize GPS coordinates
    let gps = null;
    if (raw.latitude != null && raw.longitude != null) {
      gps = {
        lat: raw.latitude,
        lng: raw.longitude,
      };
      if (raw.altitude != null) {
        gps.altitude = raw.altitude;
      }
    } else if (raw.GPSLatitude != null && raw.GPSLongitude != null) {
      // Manual parse if exifr GPS option didn't fire
      const lat = convertDMSToDD(raw.GPSLatitude, raw.GPSLatitudeRef);
      const lng = convertDMSToDD(raw.GPSLongitude, raw.GPSLongitudeRef);
      if (lat != null && lng != null) {
        gps = { lat, lng };
      }
    }

    // Normalize shutter speed
    const rawShutter = raw.ExposureTime ?? raw.ShutterSpeedValue;
    const shutterSpeed = rawShutter != null ? formatShutter(rawShutter) : null;

    // Normalize ISO
    const iso = raw.ISOSpeedRatings ?? raw.ISO ?? null;

    // Normalize aperture
    const aperture = raw.FNumber ?? raw.ApertureValue ?? null;

    // Normalize date taken
    const dateTaken =
      raw.DateTimeOriginal ?? raw.DateTimeDigitized ?? raw.DateTime ?? null;

    // Normalize dimensions
    const width = raw.ExifImageWidth ?? raw.ImageWidth ?? null;
    const height = raw.ExifImageHeight ?? raw.ImageHeight ?? null;

    return {
      gps,
      cameraMake: raw.Make ?? null,
      cameraModel: raw.Model ?? null,
      lensModel: raw.LensModel ?? raw.LensMake ?? null,
      focalLength: raw.FocalLength ?? null,
      aperture,
      shutterSpeed,
      iso,
      dateTaken: dateTaken ? new Date(dateTaken).toISOString() : null,
      colorSpace: raw.ColorSpace ?? null,
      orientation: raw.Orientation ?? null,
      width,
      height,
      software: raw.Software ?? null,
      flash: raw.Flash ?? null,
      meteringMode: raw.MeteringMode ?? null,
      whiteBalance: raw.WhiteBalance ?? null,
      exposureMode: raw.ExposureMode ?? null,
    };
  } catch (err) {
    console.warn('[exifService] Failed to extract EXIF data:', err.message);
    return {};
  }
}

/**
 * Convert DMS (degrees, minutes, seconds) array to decimal degrees.
 * @param {number[]} dms - [degrees, minutes, seconds]
 * @param {string} ref - 'N', 'S', 'E', or 'W'
 * @returns {number|null}
 */
function convertDMSToDD(dms, ref) {
  if (!Array.isArray(dms) || dms.length < 3) return null;
  const [deg, min, sec] = dms;
  let dd = deg + min / 60 + sec / 3600;
  if (ref === 'S' || ref === 'W') dd = -dd;
  return dd;
}

module.exports = { extractExif };