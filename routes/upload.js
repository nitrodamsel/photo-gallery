const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const validateUpload = require('../middleware/validate');
const { createImage } = require('../services/imageService');
const { safeDelete } = require('../utils/fileHelpers');

/**
 * GET /api/upload
 * Renders the upload form.
 */
router.get('/', (req, res) => {
  res.render('upload', {
    title: 'Upload Image',
    error: null,
  });
});

/**
 * POST /api/upload
 * Accepts multipart/form-data with field 'image'.
 * Pipeline: multer → validate mime → extract EXIF → generate thumbnails → persist.
 */
router.post(
  '/',
  (req, res, next) => {
    upload.single('image')(req, res, (err) => {
      if (err) {
        // Multer errors
        if (err.code === 'LIMIT_FILE_SIZE') {
          const maxMb = parseInt(process.env.MAX_FILE_SIZE_MB || '20', 10);
          err.message = `File too large. Maximum allowed size is ${maxMb} MB.`;
          err.status = 413;
        }
        return next(err);
      }
      next();
    });
  },
  validateUpload,
  async (req, res, next) => {
    try {
      const options = {
        title: req.body.title || undefined,
        description: req.body.description || undefined,
        tags: req.body.tags
          ? Array.isArray(req.body.tags)
            ? req.body.tags
            : req.body.tags.split(',').map((t) => t.trim()).filter(Boolean)
          : [],
      };

      const image = await createImage(req.file, options);

      res.status(201).json({
        success: true,
        message: 'Image uploaded successfully.',
        data: image,
      });
    } catch (err) {
      // Clean up uploaded file on error
      if (req.file && req.file.path) {
        await safeDelete(req.file.path);
      }
      next(err);
    }
  }
);

module.exports = router;