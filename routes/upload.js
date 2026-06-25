const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const validateUpload = require('../middleware/validate');
const imageService = require('../services/imageService');

/**
 * GET /api/upload
 * Render the upload form view.
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
 * Validates, extracts EXIF, generates thumbnails, persists to DB.
 */
router.post(
  '/',
  (req, res, next) => {
    // Handle Multer errors gracefully
    upload.single('image')(req, res, (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          const maxMB = parseInt(process.env.MAX_FILE_SIZE_MB || '20', 10);
          err.message = `File too large. Maximum allowed size is ${maxMB} MB.`;
          err.status = 413;
        } else if (err.code === 'UNSUPPORTED_FILE_TYPE') {
          err.status = 400;
        } else {
          err.status = err.status || 400;
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
        title: req.body.title || null,
        description: req.body.description || null,
        tagIds: req.body.tagIds
          ? (Array.isArray(req.body.tagIds) ? req.body.tagIds : [req.body.tagIds])
          : [],
      };

      const image = await imageService.createImage(req.file, options);

      return res.status(201).json({
        success: true,
        message: 'Image uploaded successfully.',
        data: image,
      });
    } catch (err) {
      // Clean up uploaded file if something went wrong during service processing
      if (req.file && req.file.path) {
        const { safeDelete } = require('../utils/fileHelpers');
        await safeDelete(req.file.path).catch(() => {});
      }
      err.status = err.status || 500;
      next(err);
    }
  }
);

module.exports = router;