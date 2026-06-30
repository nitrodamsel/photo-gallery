const express = require('express');
const path = require('path');
const morgan = require('morgan');
const ejsLayouts = require('express-ejs-layouts');

const config = require('./config');
const errorHandler = require('./middleware/errorHandler');
const routes = require('./routes');

const app = express();

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(ejsLayouts);
app.set('layout', 'layouts/base');

// Middleware
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/', routes);

// 404 handler
app.use((req, res) => {
  res.status(404).render('404', { title: '404 - Not Found' });
});

// Error handler
app.use(errorHandler);

module.exports = app;