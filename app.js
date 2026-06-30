const express = require('express');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');
const morgan = require('morgan');

const { errorHandler } = require('./middleware/errorHandler');
const uploadMiddleware = require('./middleware/upload');

const app = express();

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layouts/base');
app.set('layout extractScripts', true);
app.set('layout extractStyles', true);

// Middleware
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── Routes ─────────────────────────────────────────────────────────────────

// Tag management page & API
const tagsRouter = require('./routes/tags');
app.use('/tags', tagsRouter);
app.use('/api/tags', tagsRouter.api || tagsApiRouter());

// Image tags API
const imageTagsRouter = require('./routes/imageTags');
app.use('/api/images/:id/tags', imageTagsRouter);

// Gallery, upload, etc.
app.use('/', require('./routes/gallery'));
app.use('/upload', require('./routes/upload'));

// 404 handler
app.use((req, res, next) => {
  res.status(404).render('404', { title: 'Page Not Found', activePage: '' });
});

// Error handler
app.use(errorHandler);

function tagsApiRouter() {
  const express = require('express');
  const router = express.Router();
  const tagService = require('./services/tagService');

  // GET /api/tags
  router.get('/', async (req, res, next) => {
    try {
      const { q } = req.query;
      let tags;
      if (q && q.trim()) {
        tags = await tagService.searchTags(q.trim());
      } else {
        tags = await tagService.getAllTagsWithCounts();
      }
      res.json(tags);
    } catch (err) {
      next(err);
    }
  });

  // POST /api/tags
  router.post('/', async (req, res, next) => {
    try {
      const { name, color } = req.body;
      if (!name || name.trim().length < 2) {
        return res.status(400).json({ error: 'Tag name must be at least 2 characters.' });
      }
      if (name.trim().length > 30) {
        return res.status(400).json({ error: 'Tag name must be 30 characters or fewer.' });
      }
      if (!/^[a-zA-Z0-9\- ]+$/.test(name.trim())) {
        return res.status(400).json({ error: 'Tag name may only contain letters, numbers, hyphens, and spaces.' });
      }
      const tag = await tagService.findOrCreateByName(name.trim(), color);
      res.status(201).json(tag);
    } catch (err) {
      next(err);
    }
  });

  // PATCH /api/tags/:id
  router.patch('/:id', async (req, res, next) => {
    try {
      const { id } = req.params;
      const { name } = req.body;
      if (!name || name.trim().length < 2) {
        return res.status(400).json({ error: 'Tag name must be at least 2 characters.' });
      }
      if (name.trim().length > 30) {
        return res.status(400).json({ error: 'Tag name must be 30 characters or fewer.' });
      }
      if (!/^[a-zA-Z0-9\- ]+$/.test(name.trim())) {
        return res.status(400).json({ error: 'Tag name may only contain letters, numbers, hyphens, and spaces.' });
      }
      const tag = await tagService.renameTag(id, name.trim());
      res.json(tag);
    } catch (err) {
      if (err.message && (err.message.includes('not found') || err.message.includes('already exists'))) {
        return res.status(err.message.includes('not found') ? 404 : 409).json({ error: err.message });
      }
      next(err);
    }
  });

  // DELETE /api/tags/:id
  router.delete('/:id', async (req, res, next) => {
    try {
      const { id } = req.params;
      await tagService.deleteTag(id);
      res.json({ success: true, message: 'Tag deleted successfully.' });
    } catch (err) {
      if (err.message && err.message.includes('not found')) {
        return res.status(404).json({ error: err.message });
      }
      next(err);
    }
  });

  return router;
}

module.exports = app;