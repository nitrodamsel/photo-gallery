const exifr = require('exifr');
const { formatShutter } = require('../utils/exifFormatter');

/**
 * Extract and normalize EXIF metadata from an image file.
 * @param {string} filePath - Absolute path to the image.
 * @returns {Promise<Object>} Normalized EXIF data or {} on failure.
 */
async function extractExif(filePath) {
  try {
    const raw = await exifr.parse(filePath, {
      tiff: true,
      exif: true,
      gps: true,
      ifd1: false,
      // Explicit tag list to extract
      pick: [
        'Make',
        'Model',
        'LensModel',
        'LensMake',
        'FocalLength',
        'FocalLengthIn35mmFormat',
        'FNumber',
        'ExposureTime',
        'ISO',
        'ISOSpeedRatings',
        'DateTimeOriginal',
        'CreateDate',
        'ColorSpace',
        'Orientation',
        'GPSLatitude',
        'GPSLongitude',
        'GPSLatitudeRef',
        'GPSLongitudeRef',
        'GPSAltitude',
        'ImageWidth',
        'ImageHeight',
        'ExifImageWidth',
        'ExifImageHeight',
        'Software',
        'Flash',
        'WhiteBalance',
        'ExposureMode',
        'MeteringMode',
        'SceneCaptureType',
      ],
    });

    if (!raw) return {};

    // Extract GPS coordinates
    let gps = null;
    try {
      const gpsData = await exifr.gps(filePath);
      if (gpsData && gpsData.latitude != null && gpsData.longitude != null) {
        gps = {
          lat: gpsData.latitude,
          lng: gpsData.longitude,
          altitude: raw.GPSAltitude || null,
        };
      }
    } catch {
      // GPS extraction failed — non-fatal
    }

    // Normalize date taken
    const dateTaken = raw.DateTimeOriginal || raw.CreateDate || null;

    // Normalize shutter speed
    const shutterRaw = raw.ExposureTime;
    const shutterFormatted = shutterRaw != null ? formatShutter(shutterRaw) : null;

    // Normalize aperture
    const aperture = raw.FNumber != null ? `f/${raw.FNumber}` : null;

    // Normalize ISO
    const iso = raw.ISO || raw.ISOSpeedRatings || null;

    // Normalize color space
    let colorSpace = null;
    if (raw.ColorSpace != null) {
      colorSpace = raw.ColorSpace === 1 ? 'sRGB' : raw.ColorSpace === 65535 ? 'Uncalibrated' : String(raw.ColorSpace);
    }

    return {
      cameraMake: raw.Make || null,
      cameraModel: raw.Model || null,
      lensModel: raw.LensModel || raw.LensMake || null,
      focalLength: raw.FocalLength != null ? `${raw.FocalLength}mm` : null,
      focalLength35mm: raw.FocalLengthIn35mmFormat != null ? `${raw.FocalLengthIn35mmFormat}mm` : null,
      aperture,
      shutterSpeed: shutterFormatted,
      shutterSpeedRaw: shutterRaw || null,
      iso,
      dateTaken: dateTaken ? new Date(dateTaken).toISOString() : null,
      colorSpace,
      orientation: raw.Orientation || null,
      gps,
      software: raw.Software || null,
      flash: raw.Flash != null ? String(raw.Flash) : null,
      whiteBalance: raw.WhiteBalance != null ? String(raw.WhiteBalance) : null,
      exposureMode: raw.ExposureMode != null ? String(raw.ExposureMode) : null,
      meteringMode: raw.MeteringMode != null ? String(raw.MeteringMode) : null,
      imageWidth: raw.ExifImageWidth || raw.ImageWidth || null,
      imageHeight: raw.ExifImageHeight || raw.ImageHeight || null,
    };
  } catch (err) {
    console.warn(`[exifService] Failed to parse EXIF from "${filePath}": ${err.message}`);
    return {};
  }
}

module.exports = { extractExif };