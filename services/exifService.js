const exifr = require('exifr');
const { formatShutter } = require('../utils/exifFormatter');

/**
 * Extracts EXIF metadata from an image file.
 * @param {string} filePath - Absolute path to the image file.
 * @returns {Promise<Object>} Normalized EXIF data object, or {} on failure.
 */
async function extractExif(filePath) {
  try {
    const raw = await exifr.parse(filePath, {
      // GPS data
      gps: true,
      // Specific tags to extract
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
        'Software',
        'Artist',
        'Copyright',
      ],
    });

    if (!raw) {
      return {};
    }

    // Normalize GPS coordinates
    let gps = null;
    if (raw.latitude != null && raw.longitude != null) {
      gps = {
        lat: raw.latitude,
        lng: raw.longitude,
      };
    }

    // Normalize shutter speed
    let shutterSpeed = null;
    if (raw.ExposureTime != null) {
      shutterSpeed = {
        raw: raw.ExposureTime,
        formatted: formatShutter(raw.ExposureTime),
      };
    }

    // Normalize date taken
    const dateTaken = raw.DateTimeOriginal || raw.CreateDate || null;

    return {
      cameraMake: raw.Make || null,
      cameraModel: raw.Model || null,
      lens: raw.LensModel || null,
      focalLength: raw.FocalLength != null ? `${raw.FocalLength}mm` : null,
      aperture: raw.FNumber != null ? `f/${raw.FNumber}` : null,
      shutterSpeed,
      iso: raw.ISO || null,
      dateTaken: dateTaken ? dateTaken.toISOString() : null,
      colorSpace: raw.ColorSpace != null ? String(raw.ColorSpace) : null,
      orientation: raw.Orientation || null,
      imageWidth: raw.ImageWidth || null,
      imageHeight: raw.ImageHeight || null,
      gps,
      exposureProgram: raw.ExposureProgram || null,
      meteringMode: raw.MeteringMode || null,
      flash: raw.Flash || null,
      whiteBalance: raw.WhiteBalance || null,
      software: raw.Software || null,
      artist: raw.Artist || null,
      copyright: raw.Copyright || null,
    };
  } catch (err) {
    console.warn(`[exifService] Failed to parse EXIF for "${filePath}": ${err.message}`);
    return {};
  }
}

module.exports = { extractExif };