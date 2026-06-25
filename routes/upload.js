const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const validateUpload = require('../middleware/validate');
const imageService = require('../services/imageService');

/**
 * GET /api/upload
 * Render the upload form.
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
 * Handle image upload with validation, EXIF extraction, and thumbnail generation.
 */
router.post(
  '/',
  // Step 1: Multer handles multipart parsing, disk storage, and initial MIME check
  (req, res, next) => {
    upload.single('image')(req, res, (err) => {
      if (err) {
        // Multer-specific errors
        if (err.code === 'LIMIT_FILE_SIZE') {
          const maxMB = parseInt(process.env.MAX_FILE_SIZE_MB || '20', 10);
          return next(
            Object.assign(new Error(`File too large. Maximum allowed size is ${maxMB} MB.`), {
              status: 400,
              code: 'FILE_TOO_LARGE',
            })
          );
        }
        return next(err);
      }
      next();
    });
  },
  // Step 2: Post-upload magic-byte validation
  validateUpload,
  // Step 3: Service orchestration
  async (req, res, next) => {
    try {
      const options = {
        title: req.body.title || null,
        description: req.body.description || null,
        tags: req.body.tags
          ? Array.isArray(req.body.tags)
            ? req.body.tags
            : req.body.tags.split(',').map((t) => t.trim()).filter(Boolean)
          : [],
        status: 'active',
      };

      const image = await imageService.createImage(req.file, options);

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