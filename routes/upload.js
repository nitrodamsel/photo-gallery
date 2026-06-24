const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const validateUpload = require('../middleware/validate');
const imageService = require('../services/imageService');

/**
 * GET /api/upload
 * Render the upload form
 */
router.get('/', (req, res) => {
  res.render('upload', {
    title: 'Upload Image',
    error: null,
  });
});

/**
 * POST /api/upload
 * Upload a new image, extract EXIF, generate thumbnails, persist to DB.
 */
router.post(
  '/',
  // 1. Multer handles multipart parsing + initial MIME filter + size limit
  (req, res, next) => {
    const uploadSingle = upload.single('image');
    uploadSingle(req, res, (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          const maxMB = parseInt(process.env.MAX_FILE_SIZE_MB || '20', 10);
          return res.status(413).json({
            success: false,
            error: `File too large. Maximum size is ${maxMB} MB.`,
            code: 'FILE_TOO_LARGE',
          });
        }
        if (err.code === 'INVALID_FILE_TYPE') {
          return res.status(400).json({
            success: false,
            error: err.message,
            code: err.code,
          });
        }
        return next(err);
      }
      next();
    });
  },

  // 2. Post-upload validation (magic bytes check)
  validateUpload,

  // 3. Service layer orchestration
  async (req, res, next) => {
    try {
      const tags = req.body.tags
        ? Array.isArray(req.body.tags)
          ? req.body.tags
          : req.body.tags.split(',').map((t) => t.trim()).filter(Boolean)
        : [];

      const image = await imageService.createImage(req.file, {
        tags,
        title: req.body.title || null,
        description: req.body.description || null,
      });

      return res.status(201).json({
        success: true,
        data: image,
      });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;