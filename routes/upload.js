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
 * Accepts multipart/form-data with field 'image'
 * Pipeline: multer upload → MIME validation → imageService.createImage()
 */
router.post(
  '/',
  // Step 1: Multer handles disk storage, MIME pre-filter, and size limit
  (req, res, next) => {
    upload.single('image')(req, res, (err) => {
      if (err) {
        // Multer-specific error handling
        if (err.code === 'LIMIT_FILE_SIZE') {
          const maxMB = process.env.MAX_FILE_SIZE_MB || '20';
          return next(
            Object.assign(
              new Error(`File too large. Maximum allowed size is ${maxMB} MB.`),
              { status: 413, code: 'FILE_TOO_LARGE' }
            )
          );
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return next(
            Object.assign(
              new Error('Unexpected field. Use field name "image" for file upload.'),
              { status: 400, code: 'UNEXPECTED_FIELD' }
            )
          );
        }
        err.status = err.status || 400;
        return next(err);
      }
      next();
    });
  },

  // Step 2: Post-upload validation (magic byte check)
  validateUpload,

  // Step 3: Create image record via service layer
  async (req, res, next) => {
    try {
      const options = {};

      // Parse tags if provided
      if (req.body.tags) {
        options.tags = Array.isArray(req.body.tags)
          ? req.body.tags
          : req.body.tags.split(',').map((t) => t.trim()).filter(Boolean);
      }

      const image = await createImage(req.file, options);

      res.status(201).json({
        success: true,
        message: 'Image uploaded successfully.',
        data: image,
      });
    } catch (err) {
      // If DB create fails, try to clean up the uploaded file
      if (req.file && req.file.path) {
        const { safeDelete } = require('../utils/fileHelpers');
        await safeDelete(req.file.path).catch(() => {});
      }
      next(err);
    }
  }
);

module.exports = router;