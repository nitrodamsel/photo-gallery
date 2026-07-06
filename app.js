const express = require('express');
const path = require('path');
const morgan = require('morgan');
const compressionMiddleware = require('./middleware/compression');

const app = express();

// ── Compression (must be early, before routes) ─────────────────────────────
app.use(compressionMiddleware);

// ── View engine ─────────────────────────────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ── Static files ────────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// ── Body parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Logging ──────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/', require('./routes/index'));

// ── 404 handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).render('404', { title: 'Page Not Found' });
});

// ── Error handler ─────────────────────────────────────────────────────────────
app.use(require('./middleware/errorHandler'));

module.exports = app;