const exifr = require('exifr');
const { formatShutter } = require('../utils/exifFormatter');

/**
 * Extract and normalize EXIF metadata from an image file.
 * @param {string} filePath - Absolute path to the image file
 * @returns {Promise<object>} Structured EXIF object, or {} on failure
 */
async function extractExif(filePath) {
  try {
    const raw = await exifr.parse(filePath, {
      // Explicit tag list for consistent extraction
      pick: [
        // GPS
        'GPSLatitude',
        'GPSLongitude',
        'GPSLatitudeRef',
        'GPSLongitudeRef',
        'GPSAltitude',
        // Camera info
        'Make',
        'Model',
        'LensModel',
        'LensMake',
        // Exposure settings
        'FocalLength',
        'FNumber',
        'ExposureTime',
        'ISO',
        'ISOSpeedRatings',
        // Date
        'DateTimeOriginal',
        'CreateDate',
        'ModifyDate',
        // Image properties
        'ColorSpace',
        'Orientation',
        'ImageWidth',
        'ImageHeight',
        'ExifImageWidth',
        'ExifImageHeight',
        // Additional
        'Flash',
        'WhiteBalance',
        'ExposureMode',
        'ExposureProgram',
        'MeteringMode',
        'Software',
      ],
      // Parse GPS into decimal degrees automatically
      gps: true,
      translateValues: true,
      translateKeys: true,
      reviveValues: true,
    });

    if (!raw) {
      return {};
    }

    // Normalize GPS coordinates
    let gps = null;
    if (raw.latitude != null && raw.longitude != null) {
      // exifr provides decimal lat/lng when gps:true
      gps = {
        lat: raw.latitude,
        lng: raw.longitude,
        altitude: raw.GPSAltitude != null ? raw.GPSAltitude : null,
      };
    }

    // Normalize date taken
    const dateTaken =
      raw.DateTimeOriginal ||
      raw.CreateDate ||
      raw.ModifyDate ||
      null;

    // Normalize ISO
    const iso = raw.ISO || raw.ISOSpeedRatings || null;

    // Normalize image dimensions
    const width = raw.ExifImageWidth || raw.ImageWidth || null;
    const height = raw.ExifImageHeight || raw.ImageHeight || null;

    // Normalize shutter speed
    const shutterSpeed =
      raw.ExposureTime != null ? formatShutter(raw.ExposureTime) : null;

    return {
      // GPS
      gps,
      // Camera
      cameraMake: raw.Make || null,
      cameraModel: raw.Model || null,
      lensModel: raw.LensModel || raw.LensMake || null,
      // Exposure
      focalLength: raw.FocalLength != null ? `${raw.FocalLength}mm` : null,
      aperture: raw.FNumber != null ? `f/${raw.FNumber}` : null,
      shutterSpeed,
      iso,
      exposureTime: raw.ExposureTime || null,
      // Date
      dateTaken: dateTaken ? new Date(dateTaken).toISOString() : null,
      // Image properties
      colorSpace: raw.ColorSpace || null,
      orientation: raw.Orientation || null,
      width,
      height,
      // Additional metadata
      flash: raw.Flash || null,
      whiteBalance: raw.WhiteBalance || null,
      software: raw.Software || null,
      // Raw values preserved for reference
      _raw: raw,
    };
  } catch (err) {
    console.warn(`[exifService] Failed to extract EXIF from ${filePath}:`, err.message);
    return {};
  }
}

module.exports = { extractExif };