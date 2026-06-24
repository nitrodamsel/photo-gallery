const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const validateUpload = require('../middleware/validate');
const imageService = require('../services/imageService');

/**
 * GET /api/upload
 * Render the upload form view
 */
router.get('/', (req, res) => {
  res.render('upload', {
    title: 'Upload Image',
    error: null,
  });
});

/**
 * POST /api/upload
 * Accept multipart/form-data with field 'image'
 * Applies Multer upload middleware → validate middleware → imageService.createImage()
 */
router.post(
  '/',
  // Multer handles single file upload with field name 'image'
  (req, res, next) => {
    upload.single('image')(req, res, (err) => {
      if (err) {
        // Handle Multer-specific errors
        if (err.code === 'LIMIT_FILE_SIZE') {
          const maxMB = parseInt(process.env.MAX_FILE_SIZE_MB || '20');
          return res.status(413).json({
            success: false,
            error: `File too large. Maximum size is ${maxMB} MB.`,
          });
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return res.status(415).json({
            success: false,
            error: err.message || 'Invalid file type.',
          });
        }
        return res.status(400).json({
          success: false,
          error: err.message || 'File upload failed.',
        });
      }
      next();
    });
  },
  // Post-upload MIME validation
  validateUpload,
  // Route handler
  async (req, res) => {
    try {
      const options = {
        title: req.body.title || null,
        description: req.body.description || null,
        tags: req.body.tags
          ? req.body.tags
              .split(',')
              .map((t) => t.trim())
              .filter(Boolean)
          : [],
      };

      const image = await imageService.createImage(req.file, options);

      return res.status(201).json({
        success: true,
        data: image,
      });
    } catch (err) {
      console.error('[POST /api/upload] Error creating image:', err);
      return res.status(500).json({
        success: false,
        error: err.message || 'Failed to create image record.',
      });
    }
  }
);

module.exports = router;