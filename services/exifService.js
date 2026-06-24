const exifr = require('exifr');
const { formatShutter } = require('../utils/exifFormatter');

/**
 * Extract and normalize EXIF metadata from an image file.
 * @param {string} filePath - Absolute path to the image file
 * @returns {Promise<Object>} Structured EXIF data object, or {} on failure
 */
async function extractExif(filePath) {
  try {
    const raw = await exifr.parse(filePath, {
      // GPS
      gps: true,
      // Camera info
      Make: true,
      Model: true,
      LensModel: true,
      LensMake: true,
      FocalLength: true,
      FocalLengthIn35mmFormat: true,
      // Exposure
      FNumber: true,
      ExposureTime: true,
      ISO: true,
      ISOSpeedRatings: true,
      ExposureProgram: true,
      ExposureMode: true,
      ExposureBiasValue: true,
      MeteringMode: true,
      Flash: true,
      // Date/time
      DateTimeOriginal: true,
      CreateDate: true,
      ModifyDate: true,
      // Image properties
      ColorSpace: true,
      Orientation: true,
      ImageWidth: true,
      ImageHeight: true,
      PixelXDimension: true,
      PixelYDimension: true,
      // White balance
      WhiteBalance: true,
      // Software
      Software: true,
      Artist: true,
      Copyright: true,
    });

    if (!raw) return {};

    // Normalize GPS
    let gps = null;
    if (raw.latitude != null && raw.longitude != null) {
      gps = {
        lat: raw.latitude,
        lng: raw.longitude,
        altitude: raw.altitude || null,
      };
    } else if (raw.GPSLatitude != null && raw.GPSLongitude != null) {
      gps = {
        lat: raw.GPSLatitude,
        lng: raw.GPSLongitude,
        altitude: raw.GPSAltitude || null,
      };
    }

    // Normalize shutter speed
    const rawShutter = raw.ExposureTime;
    const shutterSpeed = rawShutter != null ? formatShutter(rawShutter) : null;

    // Normalize date taken
    const dateTaken =
      raw.DateTimeOriginal ||
      raw.CreateDate ||
      raw.ModifyDate ||
      null;

    // Normalize dimensions
    const width = raw.PixelXDimension || raw.ImageWidth || null;
    const height = raw.PixelYDimension || raw.ImageHeight || null;

    const exifData = {
      // GPS
      gps,

      // Camera
      cameraMake: raw.Make || null,
      cameraModel: raw.Model || null,
      lensModel: raw.LensModel || raw.LensMake || null,

      // Optics
      focalLength: raw.FocalLength ? `${raw.FocalLength}mm` : null,
      focalLength35mm: raw.FocalLengthIn35mmFormat ? `${raw.FocalLengthIn35mmFormat}mm` : null,
      aperture: raw.FNumber ? `f/${raw.FNumber}` : null,

      // Exposure
      shutterSpeed,
      shutterSpeedRaw: rawShutter || null,
      iso: raw.ISO || raw.ISOSpeedRatings || null,
      exposureProgram: raw.ExposureProgram || null,
      exposureMode: raw.ExposureMode || null,
      exposureBias: raw.ExposureBiasValue != null ? `${raw.ExposureBiasValue} EV` : null,
      meteringMode: raw.MeteringMode || null,
      flash: raw.Flash || null,

      // White balance
      whiteBalance: raw.WhiteBalance || null,

      // Date & time
      dateTaken: dateTaken ? new Date(dateTaken).toISOString() : null,

      // Image properties
      colorSpace: raw.ColorSpace || null,
      orientation: raw.Orientation || null,
      width,
      height,

      // Metadata
      software: raw.Software || null,
      artist: raw.Artist || null,
      copyright: raw.Copyright || null,
    };

    // Remove null values to keep the object clean (optional)
    const cleaned = Object.fromEntries(
      Object.entries(exifData).filter(([, v]) => v !== null && v !== undefined)
    );

    return cleaned;
  } catch (err) {
    console.warn(`[exifService] Failed to parse EXIF from ${filePath}:`, err.message);
    return {};
  }
}

module.exports = { extractExif };