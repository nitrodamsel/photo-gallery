const express = require('express');
const path = require('path');
const ejsLayouts = require('express-ejs-layouts');
const config = require('./config');

const app = express();

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// EJS Layouts
app.use(ejsLayouts);
app.set('layout', 'layouts/base');

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── Routes ───────────────────────────────────────────────────────────────────

// Gallery routes
app.use('/', require('./routes/gallery'));

// Upload routes
app.use('/upload', require('./routes/upload'));

// Tag management page: GET /tags
app.use('/tags', require('./routes/tags'));

// Image tag API: POST/DELETE /api/images/:id/tags
const imageTagsRouter = require('./routes/imageTags');
app.use('/api/images/:id/tags', imageTagsRouter);

// Tag API: GET/POST/PATCH/DELETE /api/tags
const tagsRouter = require('./routes/tags');
app.use('/api/tags', tagsRouter.apiRouter || buildTagApiRouter());

function buildTagApiRouter() {
  const r = express.Router();
  const tagService = require('./services/tagService');

  // GET /api/tags - search/list
  r.get('/', async (req, res, next) => {
    try {
      const { q } = req.query;
      const tags = q && q.trim()
        ? await tagService.searchTags(q.trim())
        : await tagService.getAllTagsWithCounts();
      res.json(tags);
    } catch (err) { next(err); }
  });

  // POST /api/tags - create
  r.post('/', async (req, res, next) => {
    try {
      const { name, color } = req.body;
      if (!name) return res.status(400).json({ error: 'Tag name is required' });
      const tag = await tagService.createTag(name, color);
      res.status(201).json(tag);
    } catch (err) {
      if (err.message && (err.message.includes('already exists') || err.message.includes('Invalid'))) {
        return res.status(err.message.includes('already exists') ? 409 : 400).json({ error: err.message });
      }
      next(err);
    }
  });

  // PATCH /api/tags/:id - rename
  r.patch('/:id', async (req, res, next) => {
    try {
      const { name, color } = req.body;
      if (!name) return res.status(400).json({ error: 'Tag name is required' });
      const tag = await tagService.renameTag(req.params.id, name, color);
      res.json(tag);
    } catch (err) {
      if (err.message && err.message.includes('not found')) return res.status(404).json({ error: err.message });
      if (err.message && (err.message.includes('already exists') || err.message.includes('Invalid'))) {
        return res.status(err.message.includes('already exists') ? 409 : 400).json({ error: err.message });
      }
      next(err);
    }
  });

  // DELETE /api/tags/:id - delete
  r.delete('/:id', async (req, res, next) => {
    try {
      await tagService.deleteTag(req.params.id);
      res.json({ success: true });
    } catch (err) {
      if (err.message && err.message.includes('not found')) return res.status(404).json({ error: err.message });
      next(err);
    }
  });

  return r;
}

// ─── Error Handlers ───────────────────────────────────────────────────────────
const errorHandler = require('./middleware/errorHandler');

// 404
app.use((req, res, next) => {
  res.status(404).render('404', { title: '404 Not Found', activePage: '' });
});

// General error handler
app.use(errorHandler);

module.exports = app;