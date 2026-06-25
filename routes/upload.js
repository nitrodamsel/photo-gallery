const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const validateUpload = require('../middleware/validate');
const { createImage } = require('../services/imageService');

/**
 * GET /api/upload
 * Render the upload form view
 */
router.get('/', (req, res) => {
  res.render('upload', {
    title: 'Upload Image',
    error: null,
    success: null,
  });
});

/**
 * POST /api/upload
 * Accept multipart/form-data with field 'image'
 * Pipeline: multer → validate MIME → extract EXIF → generate thumbnails → persist
 */
router.post(
  '/',
  // Step 1: Multer handles file storage
  (req, res, next) => {
    upload.single('image')(req, res, (err) => {
      if (err) {
        // Handle Multer-specific errors
        if (err.code === 'LIMIT_FILE_SIZE') {
          const maxMB = parseInt(process.env.MAX_FILE_SIZE_MB || '20', 10);
          return res.status(413).json({
            error: `File too large. Maximum size is ${maxMB} MB.`,
            code: 'FILE_TOO_LARGE',
          });
        }
        if (err.code === 'INVALID_FILE_TYPE') {
          return res.status(400).json({
            error: err.message,
            code: err.code,
          });
        }
        return next(err);
      }
      next();
    });
  },

  // Step 2: Post-upload MIME validation via magic bytes
  validateUpload,

  // Step 3: Orchestration — EXIF + thumbnails + DB
  async (req, res, next) => {
    try {
      const options = {
        title: req.body.title || null,
        description: req.body.description || null,
        tags: req.body.tags
          ? Array.isArray(req.body.tags)
            ? req.body.tags
            : req.body.tags.split(',')
          : [],
      };

      const image = await createImage(req.file, options);

      return res.status(201).json({
        success: true,
        message: 'Image uploaded successfully.',
        data: image,
      });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;